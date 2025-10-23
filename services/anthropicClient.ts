// services/anthropicClient.ts

// This type would ideally be in a shared package, but is duplicated for simplicity.
export interface MessageParam {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text', text: string }>;
}

export interface ChatRequest {
  messages: MessageParam[];
  userMessage: string;
  use1HourCache?: boolean;
  includeLargeDocument?: boolean;
  includeTools?: boolean;
  resetConversation?: boolean;
}

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

const API_BASE_URL = 'http://localhost:3001/api';

export const sendMessageToBackend = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send message to backend');
  }

  return response.json();
};
