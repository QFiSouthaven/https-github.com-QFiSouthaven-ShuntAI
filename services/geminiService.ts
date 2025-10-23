import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { ShuntAction, GeminiResponse, TokenUsage, ImplementationTask } from '../types';
import { getPromptForAction } from './prompts';
import { logFrontendError, ErrorSeverity } from "../utils/errorLogger";

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
        const prompt = getPromptForAction(text, action);
        
        const isComplexAction = action === ShuntAction.MAKE_ACTIONABLE || action === ShuntAction.BUILD_A_SKILL;
        const config = (isComplexAction && modelName.includes('pro')) ? { thinkingConfig: { thinkingBudget: 32768 } } : {};

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config,
        });
        
        const resultText = response.text;
        const tokenUsage = mapTokenUsage(response, modelName);
        
        if (action === ShuntAction.FORMAT_JSON || action === ShuntAction.MAKE_ACTIONABLE || action === ShuntAction.GENERATE_VAM_PRESET) {
            let cleanedText = resultText.trim();
            if (cleanedText.startsWith('```')) {
                const firstNewLineIndex = cleanedText.indexOf('\n');
                cleanedText = firstNewLineIndex !== -1 ? cleanedText.substring(firstNewLineIndex + 1) : cleanedText.substring(3);
            }
            if (cleanedText.endsWith('```')) {
                cleanedText = cleanedText.substring(0, cleanedText.length - 3);
            }
            return { resultText: cleanedText.trim(), tokenUsage };
        }

        return { resultText, tokenUsage };
    };
    return await withRetries(apiCall);
  } catch (error) {
    logFrontendError(error, ErrorSeverity.High, { context: 'performShunt Gemini API call' });
    throw new Error('Failed to get a response from the AI. Please check your connection and try again.');
  }
};

export const generateOrchestratorReport = async (prompt: string): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
  try {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return { resultText: response.text, tokenUsage: mapTokenUsage(response, model) };
    };
    return await withRetries(apiCall);
  } catch (error) {
    logFrontendError(error, ErrorSeverity.High, { context: 'generateOrchestratorReport Gemini API call' });
    throw new Error('Failed to generate the analysis report. Please try again.');
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
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return { resultText: response.text, tokenUsage: mapTokenUsage(response, model) };
    };
    return await withRetries(apiCall);
  } catch (error) {
    logFrontendError(error, ErrorSeverity.High, { context: 'generatePerformanceReport Gemini API call' });
    throw new Error('Failed to generate the performance report. Please try again.');
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

  const model = 'gemini-2.5-flash';

  try {
    const apiCall = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      const tokenUsage = mapTokenUsage(response, model);
      const jsonText = response.text;
      const parsedResponse = JSON.parse(jsonText);

      return {
        answer: parsedResponse.answer || "Sorry, I couldn't generate a proper response.",
        isContextRelated: parsedResponse.isContextRelated ?? true, // Default to true to avoid showing the notice on parsing errors
        tokenUsage,
      };
    };
    return await withRetries(apiCall);
  } catch (error) {
    logFrontendError(error, ErrorSeverity.High, { context: 'getAIChatResponseWithContextFlag Gemini API call' });
    throw new Error('Failed to get a response from the AI. The response may have been malformed JSON.');
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
        const jsonText = response.text;
        const parsedResponse = JSON.parse(jsonText);

        return {
            clarifyingQuestions: [],
            architecturalProposal: '',
            implementationTasks: [],
            testCases: [],
            ...parsedResponse,
            tokenUsage,
        };
    };
    return await withRetries(apiCall);
  } catch (error) {
    logFrontendError(error, ErrorSeverity.Critical, { context: 'generateDevelopmentPlan Gemini API call' });
    throw new Error('Failed to generate the development plan. The AI may have returned an invalid response or malformed JSON.');
  }
}

export const analyzeImage = async (
  prompt: string,
  image: { base64Data: string; mimeType: string }
): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
  try {
    const apiCall = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';

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
      });

      return { resultText: response.text, tokenUsage: mapTokenUsage(response, model) };
    };
    return await withRetries(apiCall);
  } catch (error) {
    logFrontendError(error, ErrorSeverity.High, { context: 'analyzeImage Gemini API call' });
    throw new Error('Failed to analyze the image. Please try again.');
  }
};

export const startChat = (history?: { role: string, parts: { text: string }[] }[]): Chat => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history
    });
};