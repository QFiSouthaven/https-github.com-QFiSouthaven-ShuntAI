// types/schemas.ts
import { z } from 'zod';

// --- Shared Schemas ---
export const tokenUsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  model: z.string(),
});

// --- Gemini Service Schemas ---
export const shuntResponseSchema = z.object({
  resultText: z.string(),
  tokenUsage: tokenUsageSchema,
});

export const imageAnalysisResponseSchema = shuntResponseSchema; // Same shape

export const implementationTaskSchema = z.object({
  filePath: z.string(),
  description: z.string(),
  details: z.string().optional(),
  newContent: z.string().optional(),
});

export const geminiDevelopmentPlanResponseSchema = z.object({
  clarifyingQuestions: z.array(z.string()),
  architecturalProposal: z.string(),
  implementationTasks: z.array(implementationTaskSchema),
  testCases: z.array(z.string()),
  internalMonologue: z.string().optional(),
});

export const geminiCodeFixResponseSchema = geminiDevelopmentPlanResponseSchema.extend({
    implementationTasks: z.array(implementationTaskSchema.extend({
        newContent: z.string(), // newContent is required for code fixes
    })),
});

export const aiChatResponseWithContextFlagSchema = z.object({
    answer: z.string(),
    isContextRelated: z.boolean(),
});


// --- Anthropic Service Schemas ---
const anthropicTextBlockSchema = z.object({
    type: z.literal('text'),
    text: z.string(),
});

const anthropicToolUseBlockSchema = z.object({
    type: z.literal('tool_use'),
    id: z.string(),
    name: z.string(),
    // FIX: `z.record` requires a key schema (e.g., z.string()) as the first argument.
    input: z.record(z.string(), z.unknown()),
});

const anthropicContentBlockSchema = z.union([anthropicTextBlockSchema, anthropicToolUseBlockSchema]);

export const anthropicMessageParamSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.union([z.string(), z.array(anthropicContentBlockSchema)]),
});

export const anthropicUsageSchema = z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
    cache_creation_input_tokens: z.number(),
    cache_read_input_tokens: z.number(),
    cache_creation: z.object({
        ephemeral_5m_input_tokens: z.number().optional(),
        ephemeral_1h_input_tokens: z.number().optional(),
    }).optional(),
});

export const anthropicChatResponseSchema = z.object({
    message: anthropicMessageParamSchema,
    usage: anthropicUsageSchema,
    model: z.string(),
});

export const chatRequestSchema = z.object({
    messages: z.array(anthropicMessageParamSchema),
    userMessage: z.string(),
    use1HourCache: z.boolean().optional(),
    includeLargeDocument: z.boolean().optional(),
    includeTools: z.boolean().optional(),
    resetConversation: z.boolean().optional(),
});