import { useState, useCallback } from 'react';
import { sendMessageToBackend, ChatResponse } from '../services/anthropicClient';
import { audioService } from '../services/audioService';

// The MessageParam type from the SDK is complex, so we simplify for the frontend state
interface SimpleMessage {
    role: 'user' | 'assistant';
    content: any; // Can be string or array of blocks
}

export interface ChatMessage extends SimpleMessage {
  id: string; // Unique ID for React keys
  timestamp: Date;
  usage?: ChatResponse['usage']; // Store usage info with the assistant message
}

interface ChatOptions {
  use1HourCache: boolean;
  includeLargeDocument: boolean;
  includeTools: boolean;
}

export const useAnthropicChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatOptions, setChatOptions] = useState<ChatOptions>({
    use1HourCache: false,
    includeLargeDocument: false,
    includeTools: false,
  });

  const generateMessageId = useCallback(() => Math.random().toString(36).substring(2, 9), []);

  const resetChat = useCallback(async () => {
    // Also send a reset request to the backend to clear its history
    await sendMessageToBackend({ messages: [], userMessage: '', resetConversation: true });
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (userMessage: string) => {
    setIsLoading(true);
    setError(null);

    const newUserMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    audioService.playSound('send');

    try {
      const response = await sendMessageToBackend({
        messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
        userMessage,
        use1HourCache: chatOptions.use1HourCache,
        includeLargeDocument: chatOptions.includeLargeDocument,
        includeTools: chatOptions.includeTools,
        resetConversation: messages.length === 0,
      });

      const newAssistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date(),
        usage: response.usage,
      };
      setMessages((prev) => [...prev, newAssistantMessage]);
      audioService.playSound('receive');
    } catch (err: any) {
      console.error('Frontend error sending message:', err);
      setError(err.message || 'An unknown error occurred.');
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
    }
  }, [messages, chatOptions, generateMessageId]);

  const updateChatOptions = useCallback((options: Partial<ChatOptions>) => {
    setChatOptions((prev) => ({ ...prev, ...options }));
  }, []);

  return {
    messages,
    isLoading,
    error,
    chatOptions,
    sendMessage,
    resetChat,
    updateChatOptions,
  };
};