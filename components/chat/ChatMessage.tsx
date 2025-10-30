

import React from 'react';
import { SparklesIcon, ErrorIcon } from '../icons';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface ChatMessageProps {
  role: 'user' | 'model' | 'error';
  content: string;
  isLoading?: boolean;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce"></span>
  </div>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isLoading }) => {
  const isUser = role === 'user';
  const isModel = role === 'model';
  const isError = role === 'error';

  const wrapperClasses = `flex items-start gap-3 ${isUser ? 'justify-end' : ''}`;
  
  const bubbleClasses = `max-w-xl p-4 rounded-2xl shadow-md ${
    isUser
      ? 'bg-fuchsia-600 text-white rounded-br-lg'
      : isError
      ? 'bg-red-900/50 border border-red-700/80 text-red-300 rounded-bl-lg'
      : 'bg-gray-700 text-gray-200 rounded-bl-lg'
  }`;
  
  const author = isUser ? 'You' : isError ? 'System Error' : 'AI';

  return (
    <div className={wrapperClasses}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isError ? 'bg-red-900/50 border-red-700' : 'bg-gray-900/50 border-gray-600'}`}>
          {isError ? <ErrorIcon className="w-5 h-5 text-red-400" /> : <SparklesIcon className="w-5 h-5 text-fuchsia-400" />}
        </div>
      )}
      <div className="flex flex-col">
        <div className="font-semibold text-sm text-gray-400 mb-1 px-2">{isUser ? '' : author}</div>
        <div className={bubbleClasses}>
            {isLoading && !content ? <TypingIndicator /> : <MarkdownRenderer content={content} />}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;