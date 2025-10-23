import Anthropic from '@anthropic-ai/sdk';
import { MessageParam, TextBlock } from '@anthropic-ai/sdk/resources/messages';
import { ChatRequest, ChatResponse, LARGE_DOCUMENT_TEXT, STATIC_TOOLS } from '../types/chat.types';

class AnthropicService {
  private anthropic: Anthropic;
  private readonly MODEL = "claude-3-haiku-20240307"; // A fast, capable model that supports caching

  // This will store the *full* conversation history for subsequent calls.
  // In a real application, this would be per-user and persisted (e.g., in a database or session store).
  private conversationHistory: MessageParam[] = [];

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables.');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  // This is a fixed system instruction, always part of the prompt.
  // It's cached with a 1-hour TTL because it's truly static and long-lived.
  private getBaseSystemPrompt(use1HourCache: boolean): TextBlock {
    const cacheControl = { type: "ephemeral", ttl: use1HourCache ? "1h" : "5m" } as const;
    return {
      type: "text",
      text: "You are an AI assistant tasked with analyzing literary works and answering user questions. Be thorough and provide insightful commentary.\n",
      cache_control: cacheControl
    };
  }

  async getChatResponse({
    userMessage,
    use1HourCache = false,
    includeLargeDocument = false,
    includeTools = false,
    resetConversation = false,
  }: ChatRequest): Promise<ChatResponse> {
    if (resetConversation) {
      this.conversationHistory = []; // Clear history for a new conversation
    }

    // Always include the base system prompt
    const systemContent: TextBlock[] = [this.getBaseSystemPrompt(use1HourCache)];

    // If a large document is requested, add it to the system prompt
    if (includeLargeDocument) {
      systemContent.push({
        type: "text",
        text: `Here is the full text of a literary work for analysis:\n${LARGE_DOCUMENT_TEXT}`,
        cache_control: { type: "ephemeral", ttl: use1HourCache ? "1h" : "5m" }, // Cache the document
      });
    }

    // Prepare tools if requested
    const tools = includeTools ? STATIC_TOOLS : undefined;

    // The previous conversation history should be present, but the `cache_control` will be
    // applied only to the NEW user message to ensure the full prefix (system + history) is cached.
    const fullMessages: MessageParam[] = [
      ...this.conversationHistory, // Existing conversation history
      {
        role: "user",
        content: [
          { type: "text", text: userMessage },
          // The documentation specifies placing cache_control on the LAST text block of the LAST user message.
          // This ensures the entire prefix up to this point (system + all prior messages + this message's prior blocks)
          // gets considered for caching/refreshing. An empty text block is a clean way to do this.
          { type: "text", text: "", cache_control: { type: "ephemeral", ttl: use1HourCache ? "1h" : "5m" } }
        ],
      },
    ];

    try {
      console.log(`Sending request to Anthropic with model: ${this.MODEL}`);
      console.log(`System prompt length: ${JSON.stringify(systemContent).length} chars`);
      console.log(`Messages count: ${fullMessages.length}`);
      console.log(`Tools included: ${!!tools}`);
      if (use1HourCache) console.log("Using 1-hour cache TTL.");

      const response = await this.anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 2048,
        system: systemContent.map(block => block.text).join('\n'), // Join system blocks into a single string
        messages: fullMessages,
        tools: tools,
      });

      // Update conversation history with the new user message and the assistant's response
      // Remove the empty cache_control block from the user message for clean history storage
      const lastUserMessage = fullMessages[fullMessages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user' && Array.isArray(lastUserMessage.content)) {
        lastUserMessage.content = lastUserMessage.content.filter(block => !(typeof block === 'object' && block.type === 'text' && block.text === '' && 'cache_control' in block));
      }
      this.conversationHistory.push(lastUserMessage);
      this.conversationHistory.push({ role: 'assistant', content: response.content });

      console.log('Anthropic API response usage:', response.usage);

      return {
        message: { role: 'assistant', content: response.content },
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
          cache_read_input_tokens: response.usage.cache_read_input_tokens,
          cache_creation: response.usage.cache_creation,
        },
        model: response.model,
      };
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      throw new Error('Failed to get response from Anthropic API.');
    }
  }
}

export const anthropicService = new AnthropicService();
