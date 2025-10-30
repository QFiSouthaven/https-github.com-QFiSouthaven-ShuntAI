// components/orchestrator/NodeDetailsPanel.tsx
import React, { useEffect, useState } from 'react';
import { OrchestratedItem } from '../mission_control/Orchestrator';
// FIX: Replace GlobeAltIcon with GlobeIcon and BranchingIcon with BrainIcon as they do not exist in the icons file.
import { XMarkIcon, ServerIcon, GlobeIcon, BrainIcon, ActionableIcon } from '../icons';

interface NodeDetailsPanelProps {
  node: OrchestratedItem;
  onClose: () => void;
}

const typeIconMap: Record<OrchestratedItem['type'], React.ReactNode> = {
    Service: <ServerIcon className="w-5 h-5 text-gray-300" />,
    Deployment: <GlobeIcon className="w-5 h-5 text-gray-300" />,
    Workflow: <BrainIcon className="w-5 h-5 text-gray-300" />,
    Task: <ActionableIcon className="w-5 h-5 text-gray-300" />,
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="py-2 border-b border-gray-700/50">
        <dt className="text-xs font-medium text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-gray-200 font-mono">{value}</dd>
    </div>
);

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Delay setting open to true to allow for CSS transition
        const timer = setTimeout(() => setIsOpen(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        // Delay calling onClose to allow for CSS transition
        setTimeout(onClose, 300);
    };

    return (
        <>
            <div className={`node-details-backdrop ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
            <div className={`node-details-panel ${isOpen ? 'open' : ''}`}>
                <header className="flex items-center justify-between p-4 border-b border-gray-600 bg-gray-900/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {typeIconMap[node.type]}
                        <h2 className="text-lg font-semibold text-gray-200">{node.name}</h2>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="p-4 overflow-y-auto flex-grow">
                    <dl>
                        <DetailRow label="ID" value={node.id} />
                        <DetailRow label="Type" value={node.type} />
                        <DetailRow label="Status" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            node.status === 'Running' ? 'bg-green-500/20 text-green-300' :
                            node.status === 'Error' ? 'bg-red-500/20 text-red-300' :
                            node.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-gray-600/50 text-gray-300'
                        }`}>{node.status}</span>} />
                        {node.version && <DetailRow label="Version" value={node.version} />}
                        <DetailRow label="Last Updated" value={new Date(node.lastUpdated).toLocaleString()} />
                        <div className="py-2">
                            <dt className="text-xs font-medium text-gray-400">Dependencies</dt>
                            <dd className="mt-1 text-sm text-gray-200 font-mono">
                                {node.dependencies && node.dependencies.length > 0 ? (
                                    <ul className="list-disc list-inside space-y-1">
                                        {node.dependencies.map(dep => <li key={dep}>{dep}</li>)}
                                    </ul>
                                ) : (
                                    'None'
                                )}
                            </dd>
                        </div>
                    </dl>
                </main>
            </div>
        </>
    );
};

export default NodeDetailsPanel;