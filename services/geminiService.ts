import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { z, ZodError } from 'zod';
// FIX: Corrected import path to be relative to the project root.
import { ShuntAction, GeminiResponse, TokenUsage, ImplementationTask, SerendipityResult, PromptModuleKey } from '../types';
import {
    shuntResponseSchema,
    imageAnalysisResponseSchema,
    aiChatResponseWithContextFlagSchema,
    geminiDevelopmentPlanResponseSchema,
    actionablePlanResponseSchema,
} from '../types/schemas';
import { getPromptForAction, promptModules } from './prompts';
import { logFrontendError, ErrorSeverity } from "../utils/errorLogger";

/**
 * A utility to parse data with a Zod schema and provide rich error logging.
 * @param schema The Zod schema to use for parsing.
 * @param data The data to parse.
 * @param context A string describing the context of the parsing (e.g., function name).
 * @returns The parsed data.
 * @throws An error if parsing fails.
 */
const parseWithZod = <T>(schema: z.ZodSchema<T>, data: unknown, context: string): T => {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            logFrontendError(error, ErrorSeverity.Critical, {
                context: `Zod validation failed in ${context}`,
                zodIssues: error.issues,
                receivedData: data,
            });
            throw new Error(`AI response has an unexpected structure (${context}). Please check the console for details.`);
        }
        // Re-throw other errors
        throw error;
    }
};


/**
 * A utility function that wraps an API call with a retry mechanism.
 * If the API call fails with a rate limit error (429), it will retry
 * the call with an exponential backoff delay.
 * @param apiCall The async function to call.
 * @returns The result of the API call.
 */
const withRetries = async <T>(apiCall: () => Promise<T>): Promise<T> => {
    const maxRetries = 3;
    let delay = 1000; // start with 1 second

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error: any) {
            const errorMessage = error.toString().toLowerCase();
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('rate limit');

            if (isRateLimitError && i < maxRetries - 1) {
                console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                // Last attempt or not a rate limit error, re-throw it
                throw error;
            }
        }
    }
    // This line should be unreachable due to the throw in the catch block on the final iteration
    throw new Error("An unexpected error occurred within the retry logic.");
};


const mapTokenUsage = (response: GenerateContentResponse, model: string): TokenUsage => {
    return {
        prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
        model: model,
    };
};

export const performShunt = async (text: string, action: ShuntAction, modelName: string): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
  try {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        if (action === ShuntAction.MAKE_ACTIONABLE) {
            const model = 'gemini-2.5-pro'; // Use Pro model for this complex task
            const prompt = `You are an expert senior frontend engineer. Analyze the following user request and deconstruct it into a series of actionable development tasks.
            
Your output must be a JSON object that strictly adheres to the provided schema. For each task, provide the file path, a brief description, and detailed implementation steps.

**User Request:**
---
${text}
---
`;
            const taskSchema = {
                type: Type.OBJECT,
                properties: {
                    filePath: { type: Type.STRING, description: "The full path to the file to be modified, or 'NEW_FILE' if a new file should be created." },
                    description: { type: Type.STRING, description: "A one-sentence summary of the task." },
                    details: { type: Type.STRING, description: "Precise, step-by-step details for the changes. If it's a new file, this should contain the full intended content." },
                },
                required: ['filePath', 'description', 'details']
            };

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    tasks: {
                        type: Type.ARRAY,
                        description: "A list of actionable development tasks.",
                        items: taskSchema
                    }
                },
                required: ['tasks']
            };

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema,
                    thinkingConfig: { thinkingBudget: 32768 },
                },
            });

            const tokenUsage = mapTokenUsage(response, model);
            const parsedJson = JSON.parse(response.text);
            const validatedData = parseWithZod(actionablePlanResponseSchema, parsedJson, 'performShunt:MAKE_ACTIONABLE');

            let resultText = `# Implementation Plan\n\nBased on your request, here are the suggested development tasks:\n\n`;
            if (validatedData.tasks.length === 0) {
                resultText += "No specific development tasks were generated. The request might have been too abstract or didn't require code changes.";
            } else {
                validatedData.tasks.forEach((task, index) => {
                    resultText += `---\n\n### Task ${index + 1}: ${task.description}\n\n`;
                    resultText += `**File:** \`${task.filePath}\`\n\n`;
                    resultText += `**Details:**\n`;
                    resultText += `\`\`\`\n${task.details || 'No details provided.'}\n\`\`\`\n\n`;
                });
            }
            return { resultText, tokenUsage };
        }

        const prompt = getPromptForAction(text, action);
        
        const isComplexAction = action === ShuntAction.BUILD_A_SKILL;
        const config = (isComplexAction && modelName.includes('pro')) ? { thinkingConfig: { thinkingBudget: 32768 } } : {};

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config,
        });
        
        const resultText = response.text;
        // FIX: The `model` variable was not defined; corrected to use `modelName` from the function arguments.
        const tokenUsage = mapTokenUsage(response, modelName);
        
        if (action === ShuntAction.FORMAT_JSON || action === ShuntAction.GENERATE_VAM_PRESET) {
            let cleanedText = resultText.trim();
            if (cleanedText.startsWith('```')) {
                const firstNewLineIndex = cleanedText.indexOf('\n');
                cleanedText = firstNewLineIndex !== -1 ? cleanedText.substring(firstNewLineIndex + 1) : cleanedText.substring(3);
            }
            if (cleanedText.endsWith('```')) {
                cleanedText = cleanedText.substring(0, cleanedText.length - 3);
            }
            const responseData = { resultText: cleanedText.trim(), tokenUsage };
            // FIX: This line was reported as having an error. Re-asserting the object structure to ensure correctness.
            // FIX: Explicitly provide the generic type to `parseWithZod` to fix type inference issues where the return type was incorrectly inferred as `{}`.
            return parseWithZod<z.infer<typeof shuntResponseSchema>>(shuntResponseSchema, responseData, 'performShunt');
        }
        
        const responseData = { resultText, tokenUsage };
        // FIX: This line was reported as having an error. Re-asserting the object structure to ensure correctness.
        // FIX: Explicitly provide the generic type to `parseWithZod` to fix type inference issues where the return type was incorrectly inferred as `{}`.
        return parseWithZod<z.infer<typeof shuntResponseSchema>>(shuntResponseSchema, responseData, 'performShunt');
    };
    return await withRetries(apiCall);
  } catch (error) {
    if (!(error instanceof ZodError)) {
        logFrontendError(error, ErrorSeverity.High, { context: 'performShunt Gemini API call' });
    }
    // Let the ZodError message propagate, or throw a generic one.
    throw error instanceof Error ? error : new Error('Failed to get a response from the AI. Please check your connection and try again.');
  }
};

export const executeModularPrompt = async (text: string, modules: Set<PromptModuleKey>): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
    try {
        const apiCall = async () => {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const modelName = 'gemini-2.5-pro';

            // 1. Start with the Core Directive
            let combinedPrompt = promptModules[PromptModuleKey.CORE].content;

            // 2. Add selected modules
            const moduleOrder: PromptModuleKey[] = [PromptModuleKey.COMPLEX_PROBLEM, PromptModuleKey.AGENTIC, PromptModuleKey.CONSTRAINT, PromptModuleKey.META];
            moduleOrder.forEach(key => {
                if (modules.has(key)) {
                    combinedPrompt += `\n\n---\n\n${promptModules[key].content}`;
                }
            });

            // 3. Add the user's task
            combinedPrompt += `\n\n---\n\nMy Task: "${text}"`;

            const response = await ai.models.generateContent({
                model: modelName,
                contents: combinedPrompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 },
                },
            });

            const resultText = response.text;
            const tokenUsage = mapTokenUsage(response, modelName);

            const responseData = { resultText, tokenUsage };
            return parseWithZod<z.infer<typeof shuntResponseSchema>>(shuntResponseSchema, responseData, 'executeModularPrompt');
        };
        return await withRetries(apiCall);
    } catch (error) {
        if (!(error instanceof ZodError)) {
            logFrontendError(error, ErrorSeverity.High, { context: 'executeModularPrompt Gemini API call' });
        }
        throw error instanceof Error ? error : new Error('Failed to get a response from the modular prompt engine. Please check your connection and try again.');
    }
};

export const generateOrchestratorReport = async (prompt: string): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
  try {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-pro';
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            },
        });
        // FIX: This line was reported as having an error. Re-asserting the object structure to ensure correctness.
        const responseData = { resultText: response.text, tokenUsage: mapTokenUsage(response, model) };
        // FIX: Explicitly provide the generic type to `parseWithZod` to fix type inference issues where the return type was incorrectly inferred as `{}`.
        return parseWithZod<z.infer<typeof shuntResponseSchema>>(shuntResponseSchema, responseData, 'generateOrchestratorReport');
    };
    return await withRetries(apiCall);
  } catch (error) {
    if (!(error instanceof ZodError)) {
        logFrontendError(error, ErrorSeverity.High, { context: 'generateOrchestratorReport Gemini API call' });
    }
    throw error instanceof Error ? error : new Error('Failed to generate the analysis report. Please try again.');
  }
};

export const generatePerformanceReport = async (metrics: string): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
  const prompt = `You are an expert Senior Site Reliability Engineer (SRE). Analyze the following performance metrics from a web application and provide a concise, actionable report in Markdown format.

The report should include:
1.  **Overall Health Assessment:** A brief summary (Good, Fair, Poor) and why.
2.  **Key Observations:** Bullet points highlighting significant findings (e.g., high latency in a specific API, low cache hit ratio).
3.  **Potential Bottlenecks:** Identify the most likely performance bottlenecks based on the data.
4.  **Actionable Recommendations:** Suggest 2-3 specific, high-impact actions to improve performance.

**Performance Metrics Snapshot:**
---
${metrics}
---
`;
  try {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-pro';
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            },
        });
        // FIX: This line was reported as having an error. Re-asserting the object structure to ensure correctness.
        const responseData = { resultText: response.text, tokenUsage: mapTokenUsage(response, model) };
        // FIX: Explicitly provide the generic type to `parseWithZod` to fix type inference issues where the return type was incorrectly inferred as `{}`.
        return parseWithZod<z.infer<typeof shuntResponseSchema>>(shuntResponseSchema, responseData, 'generatePerformanceReport');
    };
    return await withRetries(apiCall);
  } catch (error) {
    if (!(error instanceof ZodError)) {
        logFrontendError(error, ErrorSeverity.High, { context: 'generatePerformanceReport Gemini API call' });
    }
    throw error instanceof Error ? error : new Error('Failed to generate the performance report. Please try again.');
  }
};

export const getAIChatResponseWithContextFlag = async (prompt: string): Promise<{ answer: string; isContextRelated: boolean; tokenUsage: TokenUsage }> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      answer: {
        type: Type.STRING,
        description: "The textual answer to the user's question."
      },
      isContextRelated: {
        type: Type.BOOLEAN,
        description: "A boolean flag that is TRUE if the provided context was used to generate the answer, and FALSE if the answer was generated from general knowledge because the context was not relevant."
      }
    },
    required: ['answer', 'isContextRelated']
  };

  const model = 'gemini-2.5-pro';

  try {
    const apiCall = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          thinkingConfig: { thinkingBudget: 32768 },
        },
      });

      const tokenUsage = mapTokenUsage(response, model);
      // FIX: Clean the JSON response to remove potential markdown fences.
      let jsonText = response.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7, -3).trim();
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3, -3).trim();
      }
      const parsedResponse = JSON.parse(jsonText);
      // FIX: Explicitly provide the generic type to `parseWithZod` to fix type inference issues where the return type was incorrectly inferred as `unknown`.
      const validatedData = parseWithZod<z.infer<typeof aiChatResponseWithContextFlagSchema>>(aiChatResponseWithContextFlagSchema, parsedResponse, 'getAIChatResponseWithContextFlag');

      // FIX: Replace object spread with explicit properties to resolve compiler error.
      return {
        answer: validatedData.answer,
        isContextRelated: validatedData.isContextRelated,
        tokenUsage,
      };
    };
    return await withRetries(apiCall);
  } catch (error) {
    if (!(error instanceof ZodError)) {
        logFrontendError(error, ErrorSeverity.High, { context: 'getAIChatResponseWithContextFlag Gemini API call' });
    }
    throw error instanceof Error ? error : new Error('Failed to get a response from the AI. The response may have been malformed JSON.');
  }
};

const implementationTaskSchema = {
    type: Type.OBJECT,
    properties: {
        filePath: { type: Type.STRING, description: "The full path to the file that needs to be modified." },
        description: { type: Type.STRING, description: "A one-sentence description of the change." },
        details: { type: Type.STRING, description: "Precise, step-by-step details for a coding AI to follow. Use for descriptive plans." },
        newContent: { type: Type.STRING, description: "The full, complete new content for the file. Use for direct code fixes." },
    },
    required: ['filePath', 'description']
};


export async function generateDevelopmentPlan(goal: string, context: string): Promise<GeminiResponse> {
  const prompt = `
You are an expert software architect acting as a 'Strategy & Task Formulation' AI. Your role is to assist a user in managing the development of this application, the 'AI Content Shunt'.

You will be given a high-level development goal from the user and the project's context from a 'GEMINI_CONTEXT.md' file.

Your task is to deconstruct the goal into a clear, actionable development plan for a code-generating AI based on the schema provided.

**Project Context:**
---
${context}
---

**User's Goal:**
---
${goal}
---

**Instructions:**
1.  **Ask Clarifying Questions:** Identify any ambiguities and list questions to help the user refine the goal.
2.  **Propose an Architecture:** Briefly explain the technical approach in simple terms, referencing existing files and components.
3.  **Define Implementation Tasks:** Create a list of specific, atomic tasks for the coding AI. Each task must include the full file path to be modified, a description of the change, and precise details in the 'details' field. **DO NOT** use the 'newContent' field.
4.  **Suggest Test Cases:** Provide a list of simple, verifiable test cases to confirm the feature works as expected.
`;

    const responseSchema = {
    type: Type.OBJECT,
    properties: {
        clarifyingQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Questions to help the user refine the goal. If none, return an empty array."
        },
        architecturalProposal: {
            type: Type.STRING,
            description: "The technical approach to implementing the goal, referencing existing files and components."
        },
        implementationTasks: {
            type: Type.ARRAY,
            items: implementationTaskSchema,
            description: "A list of specific, atomic tasks for the coding AI."
        },
        testCases: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of simple, verifiable test cases to confirm the feature works as expected."
        }
    },
    required: ['clarifyingQuestions', 'architecturalProposal', 'implementationTasks', 'testCases']
  };

  try {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-pro';
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
                thinkingConfig: { thinkingBudget: 32768 },
            },
        });

        const tokenUsage = mapTokenUsage(response, model);
        // FIX: Clean the JSON response to remove potential markdown fences.
        let jsonText = response.text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7, -3).trim();
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3, -3).trim();
        }
        const parsedResponse = JSON.parse(jsonText);
        
        // FIX: Explicitly provide the generic type to `parseWithZod` to fix type inference issues where the return type was incorrectly inferred as `unknown`.
        const validatedData = parseWithZod<z.infer<typeof geminiDevelopmentPlanResponseSchema>>(geminiDevelopmentPlanResponseSchema, parsedResponse, 'generateDevelopmentPlan');

        // FIX: Replace object spread with explicit properties to resolve compiler error.
        return {
            clarifyingQuestions: validatedData.clarifyingQuestions,
            architecturalProposal: validatedData.architecturalProposal,
            implementationTasks: validatedData.implementationTasks,
            testCases: validatedData.testCases,
            internalMonologue: validatedData.internalMonologue,
            tokenUsage,
        };
    };
    return await withRetries(apiCall);
  } catch (error) {
    if (!(error instanceof ZodError)) {
        logFrontendError(error, ErrorSeverity.Critical, { context: 'generateDevelopmentPlan Gemini API call' });
    }
    throw error instanceof Error ? error : new Error('Failed to generate the development plan. The AI may have returned an invalid response or malformed JSON.');
  }
}

export const analyzeImage = async (
  prompt: string,
  image: { base64Data: string; mimeType: string }
): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
  try {
    const apiCall = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-pro';

      const imagePart = {
        inlineData: {
          data: image.base64Data,
          mimeType: image.mimeType,
        },
      };
      
      const enhancedPrompt = `
You are an expert art director and 3D character artist providing a detailed analysis of the attached image.

First, respond directly and thoroughly to the user's request.

Then, if the image contains a character, creature, or object suitable for a 3D model, add the following two sections to the end of your analysis, formatted exactly in markdown:

**8. Technical Considerations (for 3D Artists):**
*   **Topology:** Describe the ideal topology for the subject. Emphasize clean, animation-ready quad topology for smooth deformations during rigging and animation.
*   **UVs:** Detail the necessary UV mapping approach. Specify the need for well-organized, non-overlapping UV maps for all distinct parts of the model (e.g., body, head, hair, clothing).
*   **Texture Maps:** List the required texture maps for a PBR workflow. Include Diffuse/Albedo, Normal, Roughness, and Specular maps. Mention the benefit of Subsurface Scattering (SSS) maps for any organic surfaces like skin.
*   **Rigging:** Outline key considerations for rigging. Mention the importance of designing with clear joint placement and weight painting in mind for effective rigging, including the need for facial blend shapes for expressions if applicable.

**9. Virt-a-Mate Preset (JSON):**
*   **Instructions:** Based on the visual characteristics of the character in the image, generate a complete JSON preset file in the Virt-a-Mate (VAM) format.
*   **Output:** Your output for this section must be a single, well-formed JSON object inside a JSON markdown block. Do not add any explanatory text outside the JSON.
*   **Structure:** The JSON should define the character's appearance and properties, emulating the structure of a VAM preset. Include key sections within the main "storables" array for the "geometry" id: "clothing", "hair", "morphs" (this is critical for face/body shape), "textures" (with placeholder URLs like 'author.pack:/path/to/texture.jpg'), and other relevant "storables" for skin, eyes, and physics.

---
**User's Request:** ${prompt}
      `;

      const textPart = {
        text: enhancedPrompt,
      };

      const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
        },
      });
      
      // FIX: This line was reported as having an error. Re-asserting the object structure to ensure correctness.
      const responseData = { resultText: response.text, tokenUsage: mapTokenUsage(response, model) };
      // FIX: Explicitly provide the generic type to `parseWithZod` to fix type inference issues where the return type was incorrectly inferred as `{}`.
      return parseWithZod<z.infer<typeof imageAnalysisResponseSchema>>(imageAnalysisResponseSchema, responseData, 'analyzeImage');
    };
    return await withRetries(apiCall);
  } catch (error) {
    if (!(error instanceof ZodError)) {
        logFrontendError(error, ErrorSeverity.High, { context: 'analyzeImage Gemini API call' });
    }
    throw error instanceof Error ? error : new Error('Failed to analyze the image. Please try again.');
  }
};

export const startChat = (history?: { role: string, parts: { text: string }[] }[]): Chat => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
        model: 'gemini-2.5-pro',
        history: history,
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
        },
    });
};

export const generateSerendipity = async (prompt: string, onProgress: (update: string) => void): Promise<SerendipityResult> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // 1. Expand prompt
        onProgress('Expanding creative prompt...');
        const expansionResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a creative muse. Expand the following terse idea into a rich, detailed, and evocative prompt for an AI image generator. Focus on atmosphere, lighting, composition, and specific details. Original idea: "${prompt}"`,
        });
        const expandedPrompt = expansionResponse.text;

        // 2. Generate Image
        onProgress('Generating high-fidelity image...');
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: expandedPrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png' },
        });
        const imageB64 = imageResponse.generatedImages[0].image.imageBytes;

        // 3. Generate Story
        onProgress('Writing a cohesive story...');
        const storyResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imageB64,
                        },
                    },
                    {
                        text: `Based on the attached image, which was generated from the concept "${prompt}", write a short, evocative story or descriptive paragraph (100-150 words).`,
                    },
                ],
            },
        });
        const story = storyResponse.text;

        onProgress('Done.');
        return {
            imageB64,
            story,
            originalPrompt: prompt,
            expandedPrompt,
        };
    } catch (error) {
        logFrontendError(error, ErrorSeverity.Critical, { context: 'generateSerendipity' });
        throw error instanceof Error ? error : new Error('The Serendipity Engine failed. Please try again.');
    }
};
