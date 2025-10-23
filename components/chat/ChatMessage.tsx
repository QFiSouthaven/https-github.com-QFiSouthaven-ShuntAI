
import React from 'react';
import { SparklesIcon, ErrorIcon } from '../icons';

interface ChatMessageProps {
  role: 'user' | 'model' | 'error';
  content: string;
  isLoading?: boolean;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
  </div>
);

// Improved markdown-to-JSX renderer
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
    // 1. Split by code blocks first to preserve their content
    const parts = content.split(/(```[\s\S]*?```)/g);

    const renderText = (text: string) => {
        // Basic HTML escaping
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    
        // Headings
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/__(.*?)__/g, '<em>$1</em>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
        // Unordered lists - convert items to <li>
        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        // Wrap consecutive <li> blocks in <ul>.
        html = html.replace(/((?:<li>.*<\/li>\s*(?:\n|$))+)/g, '<ul>$1</ul>');
    
        // Paragraphs: Wrap lines that aren't already part of a block element.
        const finalHtml = html.split('\n').map(line => {
            // if empty or already an html tag, return as is
            if (line.trim() === '' || line.match(/^\s*</)) { 
                return line;
            }
            // otherwise, wrap in a paragraph
            return `<p>${line}</p>`;
        }).join('\n');
    
        return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
    };

    return (
        <div className="prose prose-invert prose-sm max-w-none">
            {parts.map((part, index) => {
                if (!part) return null;
                if (part.startsWith('```') && part.endsWith('```')) {
                    // It's a code block
                    const code = part.slice(3, -3).trim();
                    const languageMatch = code.match(/^[a-z]+\n/);
                    const language = languageMatch ? languageMatch[0].trim() : '';
                    const actualCode = language ? code.substring(code.indexOf('\n') + 1) : code;
                    
                    return (
                        <div key={index} className="bg-black/50 rounded-lg my-2 not-prose">
                            {language && <div className="text-xs text-gray-400 px-4 py-2 border-b border-gray-600/50">{language}</div>}
                            <pre className="p-4 text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap font-mono">
                                <code>{actualCode}</code>
                            </pre>
                        </div>
                    );
                }
                // It's regular text, render it with markdown parsing
                return <div key={index}>{renderText(part)}</div>;
            })}
        </div>
    );
};


const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isLoading }) => {
  const isUser = role === 'user';
  const isModel = role === 'model';
  const isError = role === 'error';

  const wrapperClasses = `flex items-start gap-3 ${isUser ? 'justify-end' : ''}`;
  
  const bubbleClasses = `max-w-xl p-4 rounded-2xl shadow-md ${
    isUser
      ? 'bg-cyan-600 text-white rounded-br-lg'
      : isError
      ? 'bg-red-900/50 border border-red-700/80 text-red-300 rounded-bl-lg'
      : 'bg-gray-700 text-gray-200 rounded-bl-lg'
  }`;
  
  const author = isUser ? 'You' : isError ? 'System Error' : 'AI';

  return (
    <div className={wrapperClasses}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isError ? 'bg-red-900/50 border-red-700' : 'bg-gray-900/50 border-gray-600'}`}>
          {isError ? <ErrorIcon className="w-5 h-5 text-red-400" /> : <SparklesIcon className="w-5 h-5 text-cyan-400" />}
        </div>
      )}
      <div className="flex flex-col">
        <div className="font-semibold text-sm text-gray-400 mb-1 px-2">{isUser ? '' : author}</div>
        <div className={bubbleClasses}>
            {isLoading && !content ? <TypingIndicator /> : <MarkdownContent content={content} />}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;