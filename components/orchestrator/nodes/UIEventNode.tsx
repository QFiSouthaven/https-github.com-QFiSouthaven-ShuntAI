// components/orchestrator/nodes/UIEventNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MousePointerIcon } from '../../icons';

interface UIEventData {
    id: string;
    data: {
        label: string;
        onTrigger: (id: string) => void;
    }
}

const UIEventNode = ({ id, data, selected }: NodeProps<UIEventData['data']>) => {
  return (
    <div className="relative">
      <div className={`
          bg-gray-800 rounded-lg shadow-lg border-2 w-64 transition-all duration-300
          border-gray-600/50
          ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}>
        <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
          <MousePointerIcon className="w-5 h-5 text-gray-300" />
          <h3 className="font-semibold text-gray-200 truncate flex-grow">{data.label || 'UI Event Trigger'}</h3>
        </header>
        <main className="p-4">
          <button 
            onClick={() => data.onTrigger(id)}
            className="w-full px-4 py-2 bg-fuchsia-600 text-white font-semibold rounded-md hover:bg-fuchsia-500 transition-colors"
          >
            Trigger
          </button>
        </main>
      </div>
      <div className="absolute right-[-34px] top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Trigger</div>
      <Handle type="source" position={Position.Right} id="trigger-output" className="!bg-green-500" />
    </div>
  );
};

export default memo(UIEventNode);