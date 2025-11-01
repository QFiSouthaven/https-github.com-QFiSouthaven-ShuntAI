import React from 'react';
import { BoltIcon, StarIcon, DocumentChartBarIcon } from '../icons';

const kpis = [
    { title: 'Agent Executions', value: '1,492', icon: <BoltIcon className="w-6 h-6 text-cyan-400" />, description: 'Total shunt & weaver runs today' },
    { title: 'Monetization Events', value: '87', icon: <StarIcon className="w-6 h-6 text-yellow-400" />, description: 'High-value events tracked' },
    { title: 'Data Points Captured', value: '2.3M', icon: <DocumentChartBarIcon className="w-6 h-6 text-fuchsia-400" />, description: 'Total telemetry events logged' },
];

const KPIDashboard: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.map(kpi => (
                <div key={kpi.title} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex items-center gap-4">
                    {kpi.icon}
                    <div>
                        <h3 className="text-sm font-medium text-gray-400">{kpi.title}</h3>
                        <p className="text-2xl font-bold text-gray-100">{kpi.value}</p>
                        <p className="text-xs text-gray-500">{kpi.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPIDashboard;