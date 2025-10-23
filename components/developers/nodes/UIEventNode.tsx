// components/developers/nodes/UIEventNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MousePointerIcon } from '../../icons';

const UIEventNode = ({ data, selected }: NodeProps<{ label: string }>) => {
  return (
    <div className="relative">
      <div className={`
          bg-gray-800 rounded-lg shadow-lg border-2 w-64 transition-all duration-300
          border-gray-600/50
          ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}>
        <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
          <MousePointerIcon className="w-5 h-5 text-gray-300" />
          <h3 className="font-semibold text-gray-200 truncate flex-grow">UI Event Trigger</h3>
        </header>
        <main className="p-4 text-sm">
          <label htmlFor={`event-type-${data.label}`} className="block text-xs text-gray-400 mb-1">Event Type</label>
          <select id={`event-type-${data.label}`} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 text-sm">
            <option>onClick</option>
            <option>onHover</option>
            <option>onTabSwitch</option>
          </select>
        </main>
      </div>
      <div className="absolute right-[-34px] top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Trigger</div>
      <Handle type="source" position={Position.Right} id="trigger-output" className="!bg-green-500" />
    </div>
  );
};

export default memo(UIEventNode);