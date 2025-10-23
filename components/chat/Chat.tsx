

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat as GeminiChat } from '@google/genai';
import { startChat } from '../../services/geminiService';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { DownloadIcon } from '../icons';
import TabFooter from '../common/TabFooter';
import { useTelemetry } from '../../context/TelemetryContext';
import { logFrontendError, ErrorSeverity } from '../../utils/errorLogger';
import { audioService } from '../../services/audioService';

interface Message {
  role: 'user' | 'model' | 'error';
  content: string;
}

const Chat: React.FC = () => {
  const [chat, setChat] = useState<GeminiChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { versionControlService } = useTelemetry();

  useEffect(() => {
    let newChat: GeminiChat | null = null;
    try {
      let loadedHistory = false;
      if (versionControlService) {
          const versions = versionControlService.getVersions('chat_conversation_history');
          if (versions.length > 0) {
              const latestContent = versionControlService.getVersionContent(versions[0].versionId);
              if (latestContent) {
                  try {
                      const loadedMessages: Message[] = JSON.parse(latestContent);
                      const historyForAI = loadedMessages
                        .filter(msg => msg.role === 'user' || msg.role === 'model')
                        .map(msg => ({
                            role: msg.role as 'user' | 'model',
                            parts: [{ text: msg.content }]
                        }));
                      
                      newChat = startChat(historyForAI);
                      setMessages(loadedMessages);
                      loadedHistory = true;
                  } catch (e) {
                      logFrontendError(e, ErrorSeverity.Low, { context: 'Chat.useEffect - Failed to parse chat history' });
                  }
              }
          }
      }
      
      if (!loadedHistory) {
          newChat = startChat();
          setMessages([{ role: 'model', content: 'Hello! How can I help you today?' }]);
      }
      setChat(newChat);

    } catch (e) {
      logFrontendError(e, ErrorSeverity.Critical, { context: 'Chat.useEffect - Failed to start Gemini chat session' });
      setMessages([{ role: 'error', content: `Failed to initialize chat session. ${e instanceof Error ? e.message : ''}` }]);
      setChat(null);
    }
  }, [versionControlService]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (isLoading || !chat) {
        if (!chat) {
            setMessages(prev => [...prev, { role: 'error', content: 'Cannot send message: The chat session is not active. Please try reloading.' }]);
        }
        return;
    }

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    audioService.playSound('send');
    setIsLoading(true);

    try {
        const stream = await chat.sendMessageStream({ message: messageText });
        
        let modelResponse = '';
        setMessages(prev => [...prev, { role: 'model', content: '' }]);

        for await (const chunk of stream) {
            modelResponse += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', content: modelResponse };
                return newMessages;
            });
        }
        
        audioService.playSound('receive');
        // After the final response, save the complete history
        if (versionControlService) {
            setMessages(currentMessages => {
                versionControlService.captureVersion(
                    'chat_export',
                    'chat_conversation_history',
                    JSON.stringify(currentMessages, null, 2),
                    'ai_response',
                    `Chat updated. Last message: "${messageText.substring(0, 50)}..."`,
                    { messageCount: currentMessages.length }
                );
                return currentMessages;
            });
        }

    } catch (error) {
      logFrontendError(error, ErrorSeverity.High, { context: 'Chat.handleSendMessage' });
      const errorMessage: Message = { 
        role: 'error', 
        content: `Sorry, something went wrong. Please try again.\n\n**Details:** ${error instanceof Error ? error.message : 'An unknown error occurred'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [chat, isLoading, versionControlService]);
  
  const handleExport = useCallback(() => {
    if (messages.length === 0) {
      return;
    }

    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-800/30">
      <div className="p-3 border-b border-gray-700/50 flex justify-between items-center flex-shrink-0">
        <h2 className="font-semibold text-gray-300">Conversation</h2>
        <button
          onClick={handleExport}
          disabled={messages.length === 0}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-200 bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-700/80 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export conversation to JSON"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Export JSON</span>
        </button>
      </div>
      <div className="flex-grow p-4 md:p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <ChatMessage key={index} role={msg.role} content={msg.content} />
          ))}
          {isLoading && (
             <ChatMessage role="model" content="" isLoading={true} />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 md:p-6 bg-gray-900/30 border-t border-gray-700/50">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
      <TabFooter />
    </div>
  );
};

export default Chat;