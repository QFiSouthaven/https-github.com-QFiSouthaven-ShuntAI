import React, { useState, useEffect, useRef } from 'react';
import { useAnthropicChat, ChatMessage } from '../../hooks/useAnthropicChat';
import TabFooter from '../common/TabFooter';

const AnthropicChat: React.FC = () => {
  const { messages, isLoading, error, chatOptions, sendMessage, resetChat, updateChatOptions } = useAnthropicChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const renderContent = (content: ChatMessage['content']) => {
    if (typeof content === 'string') {
      return <p>{content}</p>;
    }
    if (Array.isArray(content)) {
      return content.map((block: any, index: number) => {
        if (block.type === 'text') {
          return <p key={index}>{block.text}</p>;
        }
        if (block.type === 'tool_use') {
          return (
            <div key={index} className="anthropic-tool-use">
              <p>Calling tool: <strong>{block.name}</strong></p>
              <pre>{JSON.stringify(block.input, null, 2)}</pre>
            </div>
          );
        }
        return <p key={index}><em>[{block.type} block]</em></p>;
      });
    }
    return null;
  };

  const renderUsage = (usage?: ChatMessage['usage']) => {
    if (!usage) return null;
    return (
      <div className="anthropic-usage-info">
        <span>Tokens: In={usage.input_tokens} Out={usage.output_tokens}</span>
        {usage.cache_creation_input_tokens > 0 && (
          <span className="cache-write"> | Cache Write: {usage.cache_creation_input_tokens}</span>
        )}
        {usage.cache_read_input_tokens > 0 && (
          <span className="cache-read"> | Cache Read: {usage.cache_read_input_tokens}</span>
        )}
      </div>
    );
  };

  return (
    <div className="anthropic-chat-container p-4 md:p-6 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h3>Anthropic Prompt Caching Demo</h3>

        <div className="anthropic-chat-options">
          <label>
            <input
              type="checkbox"
              checked={chatOptions.use1HourCache}
              onChange={(e) => updateChatOptions({ use1HourCache: e.target.checked })}
              disabled={isLoading}
            />
            Use 1-hour Cache TTL
          </label>
          <label>
            <input
              type="checkbox"
              checked={chatOptions.includeLargeDocument}
              onChange={(e) => updateChatOptions({ includeLargeDocument: e.target.checked })}
              disabled={isLoading}
            />
            Include Large Document
          </label>
          <label>
            <input
              type="checkbox"
              checked={chatOptions.includeTools}
              onChange={(e) => updateChatOptions({ includeTools: e.target.checked })}
              disabled={isLoading}
            />
            Include Tools
          </label>
          <button onClick={resetChat} disabled={isLoading}>Reset Chat</button>
        </div>
      </div>

      <div className="anthropic-messages-display">
        {messages.length === 0 && !isLoading && !error && (
          <p className="anthropic-welcome-message">Start a conversation. The first valid request will create a cache. Subsequent requests will read from it, significantly reducing input tokens.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`anthropic-message-bubble ${msg.role}`}>
            <div className="anthropic-message-content">{renderContent(msg.content)}</div>
            {msg.role === 'assistant' && renderUsage(msg.usage)}
          </div>
        ))}
        {isLoading && <div className="anthropic-loading-indicator">Thinking...</div>}
        {error && <div className="anthropic-error-message">Error: {error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="anthropic-message-input-form mt-4 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about Pride & Prejudice..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>Send</button>
      </form>
      <div className='mt-auto flex-shrink-0 pt-4'>
        <TabFooter />
      </div>
    </div>
  );
};

export default AnthropicChat;
