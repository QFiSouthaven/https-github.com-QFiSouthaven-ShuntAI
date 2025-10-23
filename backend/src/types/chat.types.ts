import { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';

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

// Request structure from frontend to backend
export interface ChatRequest {
  messages: MessageParam[]; // Conversation history from the client's perspective
  userMessage: string; // The new message from the user
  use1HourCache?: boolean; // Option to use 1-hour cache
  includeLargeDocument?: boolean; // Option to include the large document
  includeTools?: boolean; // Option to include tools
  resetConversation?: boolean; // Whether to start a new conversation (clears history on backend logic)
}

// Response structure from backend to frontend
export interface ChatResponse {
  message: MessageParam;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    cache_creation?: {
      ephemeral_5m_input_tokens?: number;
      ephemeral_1h_input_tokens?: number;
    };
  };
  model: string;
}
