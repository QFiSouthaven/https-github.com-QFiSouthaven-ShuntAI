// components/orchestrator/nodes/AudioSourceNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MusicalNoteIcon } from '../../icons';

interface AudioSourceData {
    label: string;
    selectedAsset?: string;
}

const AudioSourceNode = ({ data, selected }: NodeProps<AudioSourceData>) => {
  return (
    <div className="relative">
      <div className={`
          bg-gray-800 rounded-lg shadow-lg border-2 w-64 transition-all duration-300
          border-gray-600/50
          ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}>
          <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
              <MusicalNoteIcon className="w-5 h-5 text-gray-300" />
              <h3 className="font-semibold text-gray-200 truncate flex-grow" title={data.label || 'Audio Source'}>
                  {data.label || 'Audio Source'}
              </h3>
          </header>
          <main className="p-4 text-sm">
            <p className="text-xs text-gray-400 mb-1">Audio Asset URL</p>
            {data.selectedAsset ? (
                <p className="text-xs text-cyan-300 font-mono text-center truncate" title={data.selectedAsset}>
                    {data.selectedAsset.split('/').pop()}
                </p>
            ) : (
                <p className="text-xs text-gray-500">No asset selected.</p>
            )}
          </main>
      </div>
       <div className="absolute right-[-28px] top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Audio</div>
      <Handle type="source" position={Position.Right} id="audio-output" className="!bg-blue-500" />
    </div>
  );
};

export default memo(AudioSourceNode);