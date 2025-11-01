import React from 'react';
import Loader from '../Loader';
import { CopyIcon, CheckIcon, ErrorIcon, CodeIcon } from '../icons';
// FIX: Corrected import path to be relative to the project root.
import { ShuntAction } from '../../types';

interface OutputPanelProps {
  text: string;
  isLoading: boolean;
  error: string | null;
  activeShunt: string | null;
  modulesUsed?: string[] | null;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ text, isLoading, error, activeShunt, modulesUsed }) => {
  const [copied, setCopied] = React.useState(false);
  const [markdownCopied, setMarkdownCopied] = React.useState(false);

  const handleCopy = () => {
    if (text && !copied) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleCopyToMarkdown = () => {
    if (text && !markdownCopied) {
      const isJson = activeShunt?.includes(ShuntAction.FORMAT_JSON);
      const isActionable = activeShunt?.includes(ShuntAction.MAKE_ACTIONABLE);
      const isSkill = activeShunt?.includes(ShuntAction.BUILD_A_SKILL);

      let language = '';
      if (isJson) language = 'json';
      else if (isActionable || isSkill) language = 'markdown';
      
      const markdownContent = `\`\`\`${language}\n${text}\n\`\`\``;
      
      navigator.clipboard.writeText(markdownContent);
      setMarkdownCopied(true);
      setTimeout(() => setMarkdownCopied(false), 2000);
    }
  };

  const isCodeOutput = text && (
    activeShunt?.includes(ShuntAction.FORMAT_JSON) || 
    activeShunt?.includes(ShuntAction.MAKE_ACTIONABLE) ||
    activeShunt?.includes(ShuntAction.BUILD_A_SKILL)
  );

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 flex flex-col h-full shadow-lg relative min-h-[348px] xl:min-h-0">
      <div className="p-3 border-b border-gray-700/50 flex justify-between items-center">
        <h2 className="font-semibold text-gray-300">Output</h2>
      </div>
      <div className="p-4 flex-grow relative overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-800/50 backdrop-blur-sm z-10">
            <Loader />
            <p className="mt-4 text-gray-400">{activeShunt || 'Processing...'}</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ErrorIcon className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 font-semibold">An Error Occurred</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        )}
        {!isLoading && !error && !text && (
           <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Output will appear here...</p>
          </div>
        )}
        
        {text && !isLoading && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
              <button
                onClick={handleCopyToMarkdown}
                aria-label={markdownCopied ? 'Markdown copied' : 'Copy content as Markdown'}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-200 ${
                    markdownCopied 
                    ? 'bg-green-500/20 border-green-500 text-green-300'
                    : 'bg-gray-900/60 backdrop-blur-sm border border-gray-600/50 text-gray-300 hover:bg-gray-800/80 hover:border-gray-500'
                }`}
              >
                {markdownCopied ? <CheckIcon className="w-4 h-4" /> : <CodeIcon className="w-4 h-4" />}
                <span>{markdownCopied ? 'Copied!' : 'Markdown'}</span>
              </button>
              <button
                onClick={handleCopy}
                aria-label={copied ? 'Content copied' : 'Copy content to clipboard'}
                className={`
                  flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-200
                  ${copied 
                    ? 'bg-green-500/20 border-green-500 text-green-300'
                    : 'bg-gray-900/60 backdrop-blur-sm border border-gray-600/50 text-gray-300 hover:bg-gray-800/80 hover:border-gray-500'
                  }
                `}
              >
                {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
        )}
        {modulesUsed && modulesUsed.length > 0 && (
            <div className="mb-4 p-2 bg-gray-900/50 border border-gray-700/50 rounded-md">
                <p className="text-xs text-gray-400">
                    Generated with modules: <span className="font-semibold text-fuchsia-300">{modulesUsed.join(', ')}</span>
                </p>
            </div>
        )}
        {text && (
          <pre className={`whitespace-pre-wrap break-words font-sans text-gray-300 ${isCodeOutput ? 'font-mono text-sm' : ''}`}>
            {text}
          </pre>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
