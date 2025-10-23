import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateOrchestratorReport, getAIChatResponseWithContextFlag } from '../../services/geminiService';
import FileUpload from '../common/FileUpload';
import ChatMessage from '../chat/ChatMessage';
import ChatInput from '../chat/ChatInput';
import { TrashIcon } from '../icons';
import TabFooter from '../common/TabFooter';
import { logFrontendError, ErrorSeverity } from '../../utils/errorLogger';
import { audioService } from '../../services/audioService';

interface Message {
  role: 'user' | 'model' | 'error';
  content: string;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [context, setContext] = useState<{ filename: string, content: string } | null>(null);
  const [showUnrelatedNotice, setShowUnrelatedNotice] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleFilesUploaded = (files: Array<{ filename: string; content: string; file: File }>) => {
    if (files.length === 0) return;
    
    const combinedContent = files
      .map(f => `--- File: ${f.filename} ---\n\n${f.content}`)
      .join('\n\n---\n\n');

    let contextName = files[0].filename;
    if (files.length > 1) {
        const firstPath = files[0].filename;
        const rootDir = firstPath.split('/')[0];
        contextName = `${rootDir} (${files.length} files)`;
    }

    setContext({ filename: contextName, content: combinedContent });
    setMessages([{ role: 'model', content: `Context loaded from **${contextName}**. You can now ask questions about its content.` }]);
    setShowUnrelatedNotice(false);
  };

  const handleClearContext = () => {
    setContext(null);
    setMessages([{ role: 'model', content: `Context cleared. I am now a general assistant.` }]);
    setShowUnrelatedNotice(false);
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setShowUnrelatedNotice(false);
    audioService.playSound('send');
    setIsLoading(true);

    try {
      if (context) {
        const prompt = `You are a helpful AI assistant. You have been provided with context from one or more files. Your task is to answer the user's question based on this context.

First, determine if the user's question is related to the provided context.
- If it IS related, use the context to formulate your answer.
- If it is NOT related, ignore the context and answer the question using your general knowledge.

Finally, you MUST format your response as a JSON object that strictly adheres to the following schema:
{
  "answer": "The text of your answer goes here.",
  "isContextRelated": boolean // TRUE if you used the context, FALSE otherwise.
}

CONTEXT:
---
${context.content}
---

USER'S QUESTION:
${messageText}`;

        const { answer, isContextRelated } = await getAIChatResponseWithContextFlag(prompt);
        const modelMessage: Message = { role: 'model', content: answer };
        setMessages(prev => [...prev, modelMessage]);
        
        if (!isContextRelated) {
          setShowUnrelatedNotice(true);
        }
      } else {
        const { resultText } = await generateOrchestratorReport(messageText);
        const modelMessage: Message = { role: 'model', content: resultText };
        setMessages(prev => [...prev, modelMessage]);
      }
      
      audioService.playSound('receive');

    } catch (error) {
      logFrontendError(error, ErrorSeverity.High, { context: 'AIChat.handleSendMessage' });
      const errorMessage: Message = { 
        role: 'error', 
        content: `Sorry, something went wrong. Please try again.\n\n**Details:** ${error instanceof Error ? error.message : 'An unknown error occurred'}`
      };
      setMessages(prev => [...prev, errorMessage]);
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, context]);

  return (
    <div className="flex flex-col h-full bg-gray-800/30">
      <div className="p-4 border-b border-gray-700/50 flex-shrink-0">
        {context ? (
          <div className="bg-gray-700/50 p-4 rounded-lg context-panel-animated">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-300">Active Context</h3>
                <button onClick={handleClearContext} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <TrashIcon className="w-4 h-4" /> Clear Context
                </button>
            </div>
            <p className="text-sm text-cyan-300 font-mono mt-1" title={context.filename}>{context.filename}</p>
          </div>
        ) : (
          <FileUpload
            onFilesUploaded={handleFilesUploaded}
            acceptedFileTypes={['.txt', '.md', '.js', '.py', '.pdf', '.zip', '.xml', '.xsd', '.html', '.sh', '.css', '.ts', '.jsx', '.tsx', '.yml', '.yaml', '.gitignore', 'dockerfile']}
            maxFileSizeMB={5}
          />
        )}
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
          {showUnrelatedNotice && context && (
            <div className="awareness-notice" role="alert" aria-live="polite">
              Notice: My response seems unrelated to the uploaded context.
            </div>
          )}
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
      <TabFooter />
    </div>
  );
};

export default AIChat;