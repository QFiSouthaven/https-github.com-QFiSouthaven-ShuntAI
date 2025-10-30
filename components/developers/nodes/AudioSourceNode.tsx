// components/developers/nodes/AudioSourceNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PaperAirplaneIcon } from '../../icons';

interface AudioSourceData {
    label: string;
    selectedAsset?: string;
    onChange: (id: string, data: any) => void;
}

const mockAudioAssets = [
    { value: '', label: 'Select an asset...' },
    { value: 'sounds/ui_click.wav', label: 'ui_click.wav' },
    { value: 'sounds/ui_hover.mp3', label: 'ui_hover.mp3' },
    { value: 'music/background_loop.ogg', label: 'background_loop.ogg' },
    { value: 'effects/explosion.wav', label: 'explosion.wav' },
];

const AudioSourceNode = ({ id, data, selected }: NodeProps<AudioSourceData>) => {
  return (
    <div className="relative">
      <div className={`
          bg-gray-800 rounded-lg shadow-lg border-2 w-64 transition-all duration-300
          border-gray-600/50
          ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}>
          <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
              <PaperAirplaneIcon className="w-5 h-5 text-gray-300" />
              <h3 className="font-semibold text-gray-200 truncate flex-grow" title={data.label || 'Audio Source'}>
                  {data.label || 'Audio Source'}
              </h3>
          </header>
          <main className="p-4 text-sm">
            <label htmlFor={`asset-select-${id}`} className="block text-xs text-gray-400 mb-1">Audio Asset</label>
            <select 
                id={`asset-select-${id}`}
                value={data.selectedAsset || ''}
                onChange={(e) => data.onChange(id, { ...data, selectedAsset: e.target.value })}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 text-sm"
            >
                {mockAudioAssets.map(asset => (
                    <option key={asset.value} value={asset.value}>{asset.label}</option>
                ))}
            </select>
            {data.selectedAsset && (
                <p className="text-xs text-cyan-300 font-mono mt-3 text-center truncate" title={data.selectedAsset}>
                    {data.selectedAsset}
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