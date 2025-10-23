// components/orchestrator/CustomOrchestratorNode.tsx

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { OrchestratedItem } from '../mission_control/Orchestrator';
import { ServerIcon, GlobeAltIcon, BranchingIcon, ActionableIcon } from '../icons';
import StatusIndicator from '../common/StatusIndicator';

const typeIconMap: Record<OrchestratedItem['type'], React.ReactNode> = {
  Service: <ServerIcon className="w-5 h-5 text-gray-300" />,
  Deployment: <GlobeAltIcon className="w-5 h-5 text-gray-300" />,
  Workflow: <BranchingIcon className="w-5 h-5 text-gray-300" />,
  Task: <ActionableIcon className="w-5 h-5 text-gray-300" />,
};

const getStatusBorderColor = (status: OrchestratedItem['status']) => {
    switch (status) {
        case 'Running': return 'border-green-500/80';
        case 'Error': return 'border-red-500/80';
        case 'Pending': return 'border-yellow-500/80';
        default: return 'border-gray-600/50';
    }
};


const CustomOrchestratorNode = ({ data, selected }: NodeProps<{ item: OrchestratedItem; performAction: (id: string, action: 'start' | 'stop') => void }>) => {
    const { item, performAction } = data;

    return (
        <>
            <Handle type="target" position={Position.Top} className="!bg-cyan-500" />
            <div className={`
                bg-gray-800 rounded-lg shadow-lg border-2 w-56 transition-all duration-300
                ${getStatusBorderColor(item.status)}
                ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
            `}>
                <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
                    {typeIconMap[item.type]}
                    <h3 className="font-semibold text-gray-200 truncate flex-grow" title={item.name}>{item.name}</h3>
                    <StatusIndicator status={item.status} />
                </header>
                <main className="p-3 text-sm">
                     <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                        <span>{item.type}</span>
                        {item.version && <span className="font-mono bg-gray-700/50 px-2 py-0.5 rounded">v{item.version}</span>}
                     </div>
                     <p className="text-xs text-gray-500 mb-4">
                        ID: <span className='font-mono'>{item.id}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {item.status !== 'Running' && (
                             <button onClick={() => performAction(item.id, 'start')} className="px-2 py-1 bg-green-600/80 text-white text-xs font-medium rounded-md hover:bg-green-600 flex-grow">Start</button>
                        )}
                        {item.status === 'Running' && (
                            <button onClick={() => performAction(item.id, 'stop')} className="px-2 py-1 bg-red-600/80 text-white text-xs font-medium rounded-md hover:bg-red-600 flex-grow">Stop</button>
                        )}
                         <button onClick={() => alert(`Viewing logs for ${item.name}`)} className="px-2 py-1 bg-gray-600/50 text-gray-300 text-xs font-medium rounded-md hover:bg-gray-600/80 flex-grow">Logs</button>
                    </div>
                </main>
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
        </>
    );
};

export default memo(CustomOrchestratorNode);