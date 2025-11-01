// components/orchestrator/nodes/AudioOutputNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { SpeakerWaveIcon } from '../../icons';

interface AudioOutputData {
    isPlaying?: boolean;
}

const AudioOutputNode = ({ data, selected }: NodeProps<AudioOutputData>) => {
  return (
    <div className="relative">
      <div className="absolute left-[-28px] top-[33%] -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Audio</div>
      <Handle type="target" position={Position.Left} id="audio-input" style={{ top: '33%' }} className="!bg-blue-500" />
      <div className="absolute left-[-34px] top-[66%] -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Trigger</div>
      <Handle type="target" position={Position.Left} id="trigger-input" style={{ top: '66%' }} className="!bg-green-500" />
      <div className={`
          bg-gray-800 rounded-lg shadow-lg border-2 w-64 transition-all duration-300
          ${data.isPlaying ? 'border-fuchsia-500 shadow-fuchsia-500/30' : 'border-gray-600/50'}
          ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}>
        <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
          <SpeakerWaveIcon className="w-5 h-5 text-gray-300" />
          <h3 className="font-semibold text-gray-200 truncate flex-grow">Audio Output</h3>
        </header>
        <main className="p-4 text-sm text-center h-24 flex items-center justify-center">
            <p className="text-xs text-gray-400">Connect an Audio Source and a Trigger Event.</p>
        </main>
      </div>
    </div>
  );
};
export default memo(AudioOutputNode);