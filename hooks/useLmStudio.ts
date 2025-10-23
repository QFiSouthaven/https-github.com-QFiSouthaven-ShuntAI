// hooks/useLmStudio.ts
import { useState, useCallback } from 'react';

// This is a mock implementation for demonstration purposes.
// In a real application, this would interact with a local LM Studio server.

interface LmStudioMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const useLmStudio = (model = 'local-model') => {
    const [messages, setMessages] = useState<LmStudioMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (userMessage: string) => {
        setIsLoading(true);
        setError(null);
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            // Mock API call to LM Studio
            await new Promise(resolve => setTimeout(resolve, 1000));
            const responseContent = `This is a mocked response from the local model "${model}" for your message: "${userMessage}"`;

            setMessages(prev => [...prev, { role: 'assistant', content: responseContent }]);
        } catch (err: any) {
            setError(err.message || 'Failed to get response from local model.');
        } finally {
            setIsLoading(false);
        }
    }, [model]);
    
    return { messages, isLoading, error, sendMessage };
};
