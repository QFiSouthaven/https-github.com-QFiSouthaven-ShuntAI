// components/developers/nodes/AudioSourceNode.tsx
import React, { memo, useState, useRef, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { UploadIcon, PaperAirplaneIcon } from '../../icons';

const AudioSourceNode = ({ data, selected }: NodeProps<{ label: string }>) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

  return (
    <div className="relative">
      <div className={`
          bg-gray-800 rounded-lg shadow-lg border-2 w-64 transition-all duration-300
          border-gray-600/50
          ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}>
          <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
              <PaperAirplaneIcon className="w-5 h-5 text-gray-300" />
              <h3 className="font-semibold text-gray-200 truncate flex-grow" title={data.label || 'Audio Source Node'}>
                  {data.label || 'Audio Source Node'}
              </h3>
          </header>
          <main className="p-4 text-sm">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*"
                className="hidden"
            />
            <button 
                onClick={handleButtonClick}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
            >
                <UploadIcon className="w-4 h-4" />
                <span>Upload Audio File</span>
            </button>
            {fileName && (
                <p className="text-xs text-cyan-300 font-mono mt-3 text-center truncate" title={fileName}>
                    {fileName}
                </p>
            )}
          </main>
      </div>
       <div className="absolute right-[-28px] top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Audio</div>
      <Handle type="source" position={Position.Right} id="audio-output" className="!bg-blue-500" />
    </div>
  );
};

export default memo(AudioSourceNode);