// features/mia/MiaService.ts
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { GeminiResponse, TokenUsage } from '../../types';
import { logFrontendError, ErrorSeverity } from "../../utils/errorLogger";

const mapTokenUsage = (response: GenerateContentResponse, model: string): TokenUsage => {
    return {
        prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
        model: model,
    };
};

export const getMiaChatResponse = async (history: { role: string, parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are Mia, a friendly and highly intelligent AI assistant embedded in a complex web application for developers. Be helpful and concise. Your primary role is to assist the user with understanding and operating the application.",
            },
            history,
        });
        const response = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        logFrontendError(error, ErrorSeverity.High, { context: 'getMiaChatResponse Gemini API call' });
        throw new Error('Failed to get a chat response from Mia.');
    }
};

export const getMiaErrorAnalysis = async (errorLog: Record<string, any>): Promise<string> => {
    const prompt = `You are an expert software engineer and helpful AI assistant named Mia. You are embedded within a web application. Your task is to analyze the following error report that was just captured from the application. Your analysis should be clear, concise, and helpful to the developer using the application. Structure your response in Markdown.

1.  **Explain the Error:** In simple terms, what does this error mean?
2.  **Identify the Likely Cause:** Based on the stack trace and provided context, what is the most probable reason for this error? Point to specific files or components if possible.
3.  **Suggest a Solution:** Provide concrete, actionable steps the developer can take to fix the issue. If possible, suggest specific code changes.

Here is the error report:
---
${JSON.stringify(errorLog, null, 2)}
---`;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        logFrontendError(error, ErrorSeverity.Critical, { context: 'getMiaErrorAnalysis Gemini API call' });
        throw new Error('Failed to get error analysis from Mia.');
    }
};

export const generateCodeFixPlan = async (errorLog: Record<string, any>, projectContext: string): Promise<GeminiResponse> => {
  const prompt = `
You are an expert software engineer AI named Mia. Your task is to fix a bug in the application you are embedded in.

Analyze the following error report and the general project context. Your goal is to generate a complete, production-quality code fix.

**Error Report:**
---
${JSON.stringify(errorLog, null, 2)}
---

**Project Context:**
---
${projectContext}
---

**Instructions:**
1.  **Analyze:** Determine the root cause of the error.
2.  **Formulate a Fix:** Create a plan to fix the error. This plan will consist of modifying one or more files.
3.  **Generate Full File Content:** For each file that needs to be modified, you **MUST** provide the **ENTIRE, NEW, and COMPLETE file content** in the 'newContent' field of your response. Do not provide diffs, partial code, or explanations in the 'newContent' field. It must be only the raw code for the complete file.
4.  **Be Precise:** Ensure the file paths are correct and the generated code is syntactically valid and follows the project's conventions.
5.  **Output:** Return your response according to the provided JSON schema. You are not required to provide clarifying questions, an architectural proposal, or test cases for this task. Return empty arrays for those fields.
`;
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

    const responseSchema = {
    type: Type.OBJECT,
    properties: {
        clarifyingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        architecturalProposal: { type: Type.STRING },
        implementationTasks: {
            type: Type.ARRAY,
            items: {
                ...implementationTaskSchema,
                required: ['filePath', 'description', 'newContent'], // newContent is now required for this operation
            },
            description: "A list of files to modify with their full new content."
        },
        testCases: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['implementationTasks']
  };

  try {
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
        testCases: [],
        ...parsedResponse,
        tokenUsage,
    };
  } catch (error) {
    logFrontendError(error, ErrorSeverity.Critical, { context: 'generateCodeFixPlan Gemini API call' });
    throw new Error('Failed to generate the code fix. The AI may have returned an invalid response or malformed JSON.');
  }
};