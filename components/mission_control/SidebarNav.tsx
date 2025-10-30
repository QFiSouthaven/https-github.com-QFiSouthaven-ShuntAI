import React from 'react';
// FIX: Corrected import path to be relative to the project root.
import { MissionControlTab, MissionControlTabKey } from '../../types';
import { AppIcon } from '../icons';

interface SidebarNavProps {
    tabs: MissionControlTab[];
    activeTab: MissionControlTabKey;
    onTabClick: (tabKey: MissionControlTabKey) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ tabs, activeTab, onTabClick }) => {
    return (
        <nav className="w-64 bg-gray-900/50 border border-gray-700/50 rounded-l-lg flex-shrink-0 flex flex-col">
            <div className="p-5 border-b border-gray-700/50 flex items-center gap-3">
                <AppIcon className="w-8 h-8 text-fuchsia-400" />
                <h1 className="text-xl font-bold tracking-wider text-gray-100">
                    Aether <span className="text-fuchsia-400">Shunt</span>
                </h1>
            </div>
            <ul className="flex-grow p-3 space-y-1">
                {tabs.map(tab => (
                    <li key={tab.key}>
                        <button
                            onClick={() => onTabClick(tab.key)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                                activeTab === tab.key
                                ? 'bg-fuchsia-500/10 text-fuchsia-300'
                                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default SidebarNav;