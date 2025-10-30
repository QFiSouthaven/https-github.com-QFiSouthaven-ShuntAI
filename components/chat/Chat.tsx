// components/chat/Chat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat as GeminiChat } from "@google/genai";
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TabFooter from '../common/TabFooter';
import { useTelemetry } from '../../context/TelemetryContext';
import { audioService } from '../../services/audioService';

interface Message {
  id: string;
  role: 'user' | 'model' | 'error';
  content: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<GeminiChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { versionControlService } = useTelemetry();

  useEffect(() => {
    const initChat = () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-pro',
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            },
            history: messages.filter(m => m.role !== 'error').map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }))
        });
    };
    initChat();
  }, []); // Initialize chat only once

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const saveChatHistory = useCallback(() => {
      versionControlService?.captureVersion(
          'chat_export',
          `chat_session_${new Date().toISOString()}`,
          JSON.stringify(messages, null, 2),
          'user_action',
          'User saved chat session'
      );
      alert('Chat history saved to Chronicle!');
  }, [messages, versionControlService]);

  const onSendMessage = useCallback(async (messageText: string) => {
    setIsLoading(true);
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    audioService.playSound('send');
    
    // Ensure chat is initialized
    if (!chatRef.current) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-pro',
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            },
        });
    }

    try {
      const stream = await chatRef.current.sendMessageStream({ message: messageText });
      
      let fullResponse = '';
      const assistantMessageId = (Date.now() + 1).toString();
      
      // Add a placeholder for the assistant's message
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'model', content: '', isLoading: true }]);

      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullResponse } : m));
      }

      // Final update to remove loading state
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, isLoading: false } : m));
      audioService.playSound('receive');
      
    } catch (error) {
      console.error(error);
      const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'error', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-800/30">
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg, index) => (
                    <ChatMessage key={msg.id} role={msg.role} content={msg.content} isLoading={isLoading && index === messages.length -1} />
                ))}
                {isLoading && messages[messages.length-1]?.role !== 'model' && (
                     <ChatMessage key="loading" role="model" content="" isLoading={true} />
                )}
                 <div ref={messagesEndRef} />
            </div>
        </div>
        <div className="flex-shrink-0 p-4 md:p-6 bg-gray-900/50 border-t border-gray-700/50">
            <div className="max-w-4xl mx-auto">
                 {messages.length > 0 && <button onClick={saveChatHistory} className='text-xs text-gray-400 hover:text-white mb-2'>Save Chat History</button>}
                <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
            </div>
        </div>
        <TabFooter />
    </div>
  );
};

export default Chat;