import React from 'react';
import { useMCPContext } from '../../context/MCPContext';
import { MCPConnectionStatus } from '../../types/mcp';
import FileUpload from '../common/FileUpload';

interface InputPanelProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onPasteDemo: () => void;
  onFileLoad: (text: string) => void;
  onClearFile: () => void;
  error?: string | null;
  maxLength?: number;
}

const InputPanel: React.FC<InputPanelProps> = ({ value, onChange, onBlur, onPasteDemo, onFileLoad, onClearFile, error, maxLength }) => {
  const hasError = !!error;
  
  const handleFilesUploaded = (files: Array<{ filename: string; content: string; file: File }>) => {
    // Concatenate the content of all uploaded files into the text area
    const combinedContent = files.map(f => `--- From: ${f.filename} ---\n\n${f.content}`).join('\n\n');
    onFileLoad(combinedContent);
  };

  return (
    <div className={`bg-gray-800/50 rounded-lg border ${hasError ? 'border-red-500/80' : 'border-gray-700/50'} flex flex-col h-full shadow-lg transition-colors`}>
      <div className="p-3 border-b border-gray-700/50 flex justify-between items-center">
        <h2 className="font-semibold text-gray-300">Input Content</h2>
         <div className="flex items-center gap-2">
            <button
                onClick={onClearFile}
                className="text-xs bg-red-600/50 text-red-200 px-2 py-1 rounded hover:bg-red-600/80 transition-colors"
            >
                Clear Content
            </button>
            <button
                onClick={onPasteDemo}
                className="text-xs bg-cyan-600/50 text-cyan-200 px-2 py-1 rounded hover:bg-cyan-600/80 transition-colors"
            >
                Paste Demo Text
            </button>
         </div>
      </div>
      <div className="p-3 flex-grow flex flex-col gap-4">
        <textarea
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="Paste, type, or drop a file here..."
          className="w-full h-48 flex-grow bg-gray-900/50 rounded-md border border-gray-700 p-3 text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
          maxLength={maxLength}
        />
        <FileUpload 
            onFilesUploaded={handleFilesUploaded}
            acceptedFileTypes={['.txt', '.md', '.json', '.svg', '.js', '.py', '.pdf', '.zip', '.xml', '.xsd', '.html', '.sh', '.css', '.ts', '.jsx', '.tsx', '.yml', '.yaml', '.gitignore', 'dockerfile']}
            maxFileSizeMB={10}
        />
        <div className="flex justify-end items-center px-1 pb-1 text-xs h-4">
            {error ? (
                <span className="text-red-400">{error}</span>
            ) : (
                <span /> // Keep space consistent
            )}
            {maxLength !== undefined && (
                <span className={`ml-auto ${value.length > maxLength ? 'text-red-400 font-semibold' : 'text-gray-500'}`}>
                    {value.length} / {maxLength}
                </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default InputPanel;