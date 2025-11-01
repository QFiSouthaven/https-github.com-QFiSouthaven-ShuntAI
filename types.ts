// types.ts
// FIX: Import React to provide the React namespace for types like React.FC.
import React, { ReactNode } from 'react';
import { z } from 'zod';
import { 
    tokenUsageSchema, 
    implementationTaskSchema, 
    geminiDevelopmentPlanResponseSchema,
    chatRequestSchema, 
    anthropicChatResponseSchema
} from './types/schemas';

// FIX: Define the Tool type locally to resolve the import error.
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: {
      [key: string]: {
        type: string;
        description: string;
      };
    };
    required: string[];
  };
  cache_control?: { type: 'ephemeral' };
}


export enum ShuntAction {
  SUMMARIZE = 'Summarize',
  AMPLIFY = 'Amplify',
  AMPLIFY_X2 = 'Amplify x2',
  MAKE_ACTIONABLE = 'Make Actionable',
  BUILD_A_SKILL = 'Build a Skill',
  EXPLAIN_LIKE_IM_FIVE = 'Explain Like I\'m 5',
  EXPLAIN_LIKE_A_SENIOR = 'Explain Like a Senior',
  EXTRACT_KEYWORDS = 'Extract Keywords',
  EXTRACT_ENTITIES = 'Extract Entities',
  ENHANCE_WITH_KEYWORDS = 'Enhance with Keywords',
  CHANGE_TONE_FORMAL = 'Make More Formal',
  CHANGE_TONE_CASUAL = 'Make More Casual',
  PROOFREAD = 'Proofread & Fix',
  TRANSLATE_SPANISH = 'Translate to Spanish',
  FORMAT_JSON = 'Format as JSON',
  PARSE_JSON = 'Parse JSON to Text',
  INTERPRET_SVG = 'Interpret SVG',
  GENERATE_VAM_PRESET = 'Generate VAM Preset',
  MY_COMMAND = 'Analyze & Clarify',
  GENERATE_ORACLE_QUERY = 'Generate Oracle Query',
}

export enum PromptModuleKey {
  CORE = 'CORE',
  COMPLEX_PROBLEM = 'COMPLEX_PROBLEM',
  AGENTIC = 'AGENTIC',
  CONSTRAINT = 'CONSTRAINT',
  META = 'META',
}

// Replaced interfaces with types inferred from Zod schemas for a single source of truth.
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type ImplementationTask = z.infer<typeof implementationTaskSchema>;
export type GeminiResponse = z.infer<typeof geminiDevelopmentPlanResponseSchema> & {
  tokenUsage?: TokenUsage;
};


export type MissionControlTabKey = 'shunt' | 'weaver' | 'ui_builder' | 'chat' | 'orchestrator' | 'trim_agent' | 'image_analysis' | 'terminal' | 'oraculum' | 'documentation' | 'settings' | 'anthropic_chat' | 'developers' | 'subscription' | 'serendipity_engine';

export interface MissionControlTab {
    key: MissionControlTabKey;
    label: string;
    icon: ReactNode;
    component: React.FC;
}

export interface Documentation {
  geminiContext: string;
  progressLog: string;
  decisions: string;
  issuesAndFixes: string;
  featureTimeline: string;
}

export interface MailboxFile {
    id: string;
    path: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    versionId: string;
}

// --- From features/mia/miaTypes.ts ---

export interface MiaMessage {
  id: string;
  sender: 'user' | 'mia' | 'system-error' | 'system-progress';
  text: string;
  timestamp: string;
  isHtml?: boolean; // For richer content
  action?: {
    type: 'suggest_refresh' | 'clear_cache' | 'link_to_docs' | 'run_automated_fix';
    payload?: any;
    label?: string;
  };
  diagnosableError?: MiaAlert;
  fixProposal?: GeminiResponse;
}

export interface MiaAlert {
  id: string;
  type: 'system_health' | 'predictive_bug' | 'onboarding_tip' | 'error_diagnosis' | string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  context?: Record<string, any>; // The full error log or telemetry event
  actions?: { label: string; actionType: string; payload?: any }[];
}


// --- From services/chat.types.ts ---

// Re-exporting inferred types from Zod schemas as the single source of truth.
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof anthropicChatResponseSchema>;


// Define the content for the large document. To ensure it's large enough to demonstrate
// significant token savings, we'll use a placeholder.
export const LARGE_DOCUMENT_TEXT = `
<document>
<title>Pride and Prejudice by Jane Austen</title>
<summary>
Pride and Prejudice, a classic novel by Jane Austen, follows the emotional development of Elizabeth Bennet, who learns the error of making hasty judgments and comes to appreciate the difference between the superficial and the essential. Mr. Darcy, a wealthy aristocrat, likewise learns to overcome his proud and arrogant nature. The novel explores themes of manners, marriage, morality, education, and social class in the Regency era in Great Britain. Elizabeth's realization of Darcy's true character is a central part of the story, as she navigates the societal pressures of her time. The relationship between Elizabeth and Darcy is a complex dance of pride, prejudice, and eventual understanding, making it one of the most beloved stories in English literature.
</summary>
<characters>
- Elizabeth Bennet: The witty and intelligent protagonist.
- Mr. Fitzwilliam Darcy: A wealthy, proud man who eventually wins Elizabeth's heart.
- Jane Bennet: Elizabeth's beautiful and kind older sister.
- Charles Bingley: A wealthy and amiable friend of Darcy.
</characters>
<placeholder_text>
To ensure this document is sufficiently large to demonstrate caching benefits (over 1024 tokens), this section contains repeated placeholder text. This mimics a real-world scenario where a large PDF, codebase, or transcript is included in the prompt. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam. Proin magna.
... (this text would be repeated many times to exceed the token threshold) ...
</placeholder_text>
</document>
`;

// Define the static tools available to the assistant
export const STATIC_TOOLS: Tool[] = [
  {
    name: "get_current_time",
    description: "Get the current time for a specified timezone.",
    input_schema: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "The IANA timezone name, e.g., 'America/Los_Angeles'.",
        },
      },
      required: ["timezone"],
    },
  },
  {
    name: "search_literary_database",
    description: "Search a database for details about literary works, authors, or characters.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query, e.g., 'character details for Elizabeth Bennet' or 'themes in 19th-century novels'.",
        },
      },
      required: ["query"],
    },
    // This will be the last tool definition, so we apply cache_control here.
    // It will implicitly cache all preceding tool definitions as well.
    cache_control: { type: "ephemeral" },
  },
];

export interface SerendipityResult {
  imageB64: string;
  story: string;
  originalPrompt: string;
  expandedPrompt: string;
}