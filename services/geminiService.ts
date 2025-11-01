import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { z, ZodError } from 'zod';
// FIX: Corrected import path to be relative to the project root.
import { ShuntAction, GeminiResponse, TokenUsage, ImplementationTask, SerendipityResult, PromptModuleKey } from '../types';
import {
    shuntResponseSchema,
    imageAnalysisResponseSchema,
    geminiDevelopmentPlanResponseSchema,
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
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted');
            
            if (isRateLimitError && i < maxRetries - 1) {
                console.warn(`Rate limit exceeded. Retrying in ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // exponential backoff
            } else {
                throw error; // Re-throw if it's not a rate limit error or retries are exhausted
            }
        }
    }
    // This should not be reachable, but typescript needs a return path
    throw new Error("Exhausted retries for API call.");
};

const mapTokenUsage = (response: GenerateContentResponse, model: string): TokenUsage => {
    return {
        prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
        model: model,
    };
};

const callGeminiAPI = async (prompt: string, modelName: string, jsonResponseSchema?: any): Promise<GenerateContentResponse> => {
    return withRetries(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const config: any = {};
        if (jsonResponseSchema) {
            config.responseMimeType = "application/json";
            config.responseSchema = jsonResponseSchema;
        }

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config
        });
        return response;
    });
};

export const performShunt = async (text: string, action: ShuntAction, model: string): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
    const prompt = getPromptForAction(text, action);
    const response = await callGeminiAPI(prompt, model);
    const resultText = response.text;
    const tokenUsage = mapTokenUsage(response, model);
    return { resultText, tokenUsage };
};

export const executeModularPrompt = async (text: string, modules: Set<PromptModuleKey>): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
    let fullPrompt = promptModules.CORE.content;
    for (const key of modules) {
        if (promptModules[key]) {
            fullPrompt += `\n\n---\n\n${promptModules[key].content}`;
        }
    }
    fullPrompt += `\n\n---\n\nUser Input:\n${text}`;
    
    const model = 'gemini-2.5-pro';
    const response = await callGeminiAPI(fullPrompt, model);
    const resultText = response.text;
    const tokenUsage = mapTokenUsage(response, model);
    return { resultText, tokenUsage };
};

export const generateDevelopmentPlan = async (goal: string, context: string): Promise<GeminiResponse> => {
    const prompt = `
**Goal:**
${goal}

**Project Context:**
---
${context}
---

Based on the goal and project context, generate a complete development plan.`;
    const model = 'gemini-2.5-pro';
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            clarifyingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            architecturalProposal: { type: Type.STRING },
            implementationTasks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        filePath: { type: Type.STRING },
                        description: { type: Type.STRING },
                        details: { type: Type.STRING },
                    },
                    required: ['filePath', 'description']
                }
            },
            testCases: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['implementationTasks']
    };
    const response = await callGeminiAPI(prompt, model, responseSchema);
    const parsedResponse = JSON.parse(response.text);
    const tokenUsage = mapTokenUsage(response, model);
    return { ...parsedResponse, tokenUsage };
};

export const analyzeImage = async (prompt: string, image: { base64Data: string; mimeType: string }): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-pro';
    const imagePart = {
        inlineData: {
            data: image.base64Data,
            mimeType: image.mimeType,
        },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [textPart, imagePart] },
    });

    const resultText = response.text;
    const tokenUsage = mapTokenUsage(response, model);
    return { resultText, tokenUsage };
};

export const generatePerformanceReport = async (metrics: string): Promise<{ resultText: string; tokenUsage: TokenUsage }> => {
  const prompt = `You are an AI performance analyst named TRIM. Your task is to analyze the following real-time performance metrics from the Aether Shunt application and provide a concise, actionable report.

**Current Live Metrics:**
${metrics}

**Your Report Should Include:**
1.  **Overall Health Assessment:** A one-sentence summary (e.g., "System is operating optimally," "Performance is degraded," etc.).
2.  **Key Observations:** 2-3 bullet points highlighting the most important trends or metrics.
3.  **Actionable Recommendations:** 1-2 specific suggestions for improvement.

Keep the report brief and to the point.`;
  const model = 'gemini-2.5-flash';
  const response = await callGeminiAPI(prompt, model);
  return { resultText: response.text, tokenUsage: mapTokenUsage(response, model) };
};

export const generateOrchestratorReport = async (itemsJson: string): Promise<string> => {
    const prompt = `Analyze the following system graph represented as JSON. Identify any issues, such as services with errors or broken dependency chains. Provide a concise summary of the system's health and any critical problems.
---
${itemsJson}`;
    const model = 'gemini-2.5-flash';
    const response = await callGeminiAPI(prompt, model);
    return response.text;
};

export const generateOraculumInsights = async (eventsJson: string): Promise<string> => {
    const prompt = `You are a senior data analyst with deep expertise in product-market fit and user behavior for AI-powered developer tools. Your task is to analyze a raw stream of telemetry events from the "Aether Shunt" application and extract high-value, non-obvious business insights.

**Core Principles:**
- **Think like a strategist:** Don't just summarize. Connect the dots. What do these events *imply* about user intent, product value, and market trends?
- **Identify Economic Signals:** Focus on events that indicate monetization potential, churn risk, and power-user behavior.
- **Find Behavioral Patterns:** What workflows are users creating? Which features are most and least engaging? What predicts success or failure?
- **Be Actionable:** Frame your insights as concrete recommendations for the product, marketing, or sales teams.

**Raw Telemetry Event Stream (JSON):**
---
${eventsJson}
---

**Your Analysis (in Markdown):**

### 1. Executive Summary (The "So What?")
A single, high-impact paragraph summarizing the most critical insight from this data.

### 2. Key Insights & Observations
- **Insight 1:** [Describe a significant pattern or correlation. e.g., "Users who combine 'Build a Skill' with 'Format as JSON' are 3x more likely to become power users."]
  - **Supporting Data:** [Cite specific event types or data points.]
  - **Recommendation:** [Suggest a concrete action. e.g., "Create a tutorial or template that combines these two features to accelerate user activation."]
- **Insight 2:** [Describe another pattern, perhaps related to churn or feature abandonment.]
  - **Supporting Data:** [...]
  - **Recommendation:** [...]
- **Insight 3 (Non-Obvious):** [Present a counter-intuitive or unexpected finding.]
  - **Supporting Data:** [...]
  - **Recommendation:** [...]

### 3. Emerging Trends
Based on this snapshot, what new user behaviors or market opportunities might be emerging? What should the team watch closely?
`;
    const model = 'gemini-2.5-pro';
    const response = await callGeminiAPI(prompt, model);
    return response.text;
};