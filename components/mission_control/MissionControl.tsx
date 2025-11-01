// components/mission_control/MissionControl.tsx
import React, { useState, useCallback, lazy, Suspense } from 'react';
import {
    SparklesIcon, BrainIcon, BookIcon, HistoryIcon, ServerIcon,
    ChatBubbleLeftRightIcon, PhotoIcon, DocumentIcon, Cog6ToothIcon, BoltIcon, CodeIcon, StarIcon,
    TerminalIcon, ViewfinderCircleIcon, GlobeAltIcon
} from '../icons';
import { MissionControlTab, MissionControlTabKey } from '../../types';
import Loader from '../Loader';
import SidebarNav from './SidebarNav';
import { useUndoRedoContext, UndoRedoProvider } from '../../context/UndoRedoContext';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import HeaderActions from './HeaderActions';
import FeedbackModal from '../common/FeedbackModal';
import MailboxModal from '../weaver/MailboxModal';
import { audioService } from '../../services/audioService';

// Lazy load components for code splitting and on-demand loading
const Shunt = lazy(() => import('../shunt/Shunt'));
const Weaver = lazy(() => import('../weaver/Weaver'));
const UIBuilder = lazy(() => import('../ui_builder/UIBuilder'));
const Chat = lazy(() => import('../chat/Chat'));
const Orchestrator = lazy(() => import('./Orchestrator'));
const TrimAgent = lazy(() => import('../trim_agent/TrimAgent'));
const ImageAnalysis = lazy(() => import('../image_analysis/ImageAnalysis'));
const Oraculum = lazy(() => import('../oraculum/Oraculum'));
const Developers = lazy(() => import('../developers/Developers'));
const Subscription = lazy(() => import('../subscription/Subscription'));
const Documentation = lazy(() => import('../documentation/Documentation'));
const Settings = lazy(() => import('../settings/Settings'));
const Terminal = lazy(() => import('../terminal/Terminal'));

const tabs: MissionControlTab[] = [
    { key: 'shunt', label: 'Shunt', icon: <SparklesIcon className="w-5 h-5" />, component: Shunt },
    { key: 'weaver', label: 'Weaver', icon: <BrainIcon className="w-5 h-5" />, component: Weaver },
    { key: 'ui_builder', label: 'UI Builder', icon: <ViewfinderCircleIcon className="w-5 h-5" />, component: UIBuilder },
    { key: 'chat', label: 'Chat', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />, component: Chat },
    { key: 'orchestrator', label: 'Orchestrator', icon: <ServerIcon className="w-5 h-5" />, component: Orchestrator },
    { key: 'trim_agent', label: 'TRIM Agent', icon: <BoltIcon className="w-5 h-5" />, component: TrimAgent },
    { key: 'image_analysis', label: 'Image Analysis', icon: <PhotoIcon className="w-5 h-5" />, component: ImageAnalysis },
    { key: 'terminal', label: 'Terminal', icon: <TerminalIcon className="w-5 h-5" />, component: Terminal },
    { key: 'oraculum', label: 'Oraculum', icon: <GlobeAltIcon className="w-5 h-5" />, component: Oraculum },
    { key: 'developers', label: 'Developers', icon: <CodeIcon className="w-5 h-5" />, component: Developers },
    { key: 'subscription', label: 'Subscription', icon: <StarIcon className="w-5 h-5" />, component: Subscription },
    { key: 'documentation', label: 'Documentation', icon: <DocumentIcon className="w-5 h-5" />, component: Documentation },
    { key: 'settings', label: 'Settings', icon: <Cog6ToothIcon className="w-5 h-5" />, component: Settings },
];

const LoadingFallback = () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-800/30">
        <div className="flex flex-col items-center gap-4">
            <Loader />
            <p className="text-gray-400">Loading Module...</p>
        </div>
    </div>
);


const MissionControl: React.FC = () => {
    const [activeTabKey, setActiveTabKey] = useState<MissionControlTabKey>('shunt');
    const [exitingTabKey, setExitingTabKey] = useState<MissionControlTabKey | null>(null);
    const [activationTimestamps, setActivationTimestamps] = useState<Partial<Record<MissionControlTabKey, number>>>({
        shunt: Date.now(), // Initialize the first tab on load
    });
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isMailboxModalOpen, setIsMailboxModalOpen] = useState(false);
    
    const handleTabClick = useCallback((tabKey: MissionControlTabKey) => {
        if (tabKey === activeTabKey || exitingTabKey) { // Prevent clicks during animation or on the same tab
            return;
        }

        const now = Date.now();
        const currentTabActivationTime = activationTimestamps[activeTabKey] || 0;
        const timeOnCurrentTab = now - currentTabActivationTime;
        const TWO_MINUTES_MS = 2 * 60 * 1000;

        // Always update the activation time for the new tab.
        setActivationTimestamps(prev => ({ ...prev, [tabKey]: now }));

        if (timeOnCurrentTab > TWO_MINUTES_MS) {
            // Animate if user has been on the current tab for more than 2 minutes
            setExitingTabKey(activeTabKey);
            setActiveTabKey(tabKey);
            audioService.playSound('tab_switch');
            
            setTimeout(() => {
                setExitingTabKey(null);
            }, 700); // Match CSS animation duration
        } else {
            // Switch instantly for rapid navigation
            setActiveTabKey(tabKey);
            audioService.playSound('click'); // Use a more subtle click sound for fast switches
        }
    }, [activeTabKey, exitingTabKey, activationTimestamps]);

    const activeTab = tabs.find(tab => tab.key === activeTabKey);
    const ActiveComponent = activeTab ? activeTab.component : null;
    
    const exitingTab = tabs.find(tab => tab.key === exitingTabKey);
    const ExitingComponent = exitingTab ? exitingTab.component : null;


    const { undo, redo, canUndo, canRedo } = useUndoRedoContext();

    return (
        <div className="flex h-screen w-full p-4 bg-gray-900 text-gray-200">
            <SidebarNav tabs={tabs} activeTab={activeTabKey} onTabClick={handleTabClick} />
            <main className="flex-grow flex flex-col bg-gray-800/50 border border-gray-700/50 rounded-r-lg">
                <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0 bg-gradient-to-t from-gray-900 to-gray-700">
                    <h2 className="text-lg font-semibold">{activeTab?.label}</h2>
                    <HeaderActions 
                        onUndo={undo}
                        canUndo={canUndo}
                        onRedo={redo}
                        canRedo={canRedo}
                        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
                        onOpenMailbox={() => setIsMailboxModalOpen(true)}
                    />
                </header>
                <div className="flex-grow relative overflow-hidden tab-container">
                    <ActiveTabProvider activeTab={activeTabKey}>
                        <Suspense fallback={<LoadingFallback />}>
                            {ExitingComponent && (
                                <div key={exitingTabKey} className="tab-pane tab-exit">
                                    <ExitingComponent />
                                    <div className="neon-outline-wrapper">
                                        <div className="neon-line neon-line-top"></div>
                                        <div className="neon-line neon-line-right"></div>
                                        <div className="neon-line neon-line-bottom"></div>
                                        <div className="neon-line neon-line-left"></div>
                                    </div>
                                </div>
                            )}
                            {ActiveComponent && (
                                <div key={activeTabKey} className={`tab-pane ${exitingTabKey ? 'tab-enter' : ''}`}>
                                    <ActiveComponent />
                                    <div className="neon-outline-wrapper">
                                        <div className="neon-line neon-line-top"></div>
                                        <div className="neon-line neon-line-right"></div>
                                        <div className="neon-line neon-line-bottom"></div>
                                        <div className="neon-line neon-line-left"></div>
                                    </div>
                                </div>
                            )}
                        </Suspense>
                    </ActiveTabProvider>
                </div>
            </main>
            <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
            <MailboxModal isOpen={isMailboxModalOpen} onClose={() => setIsMailboxModalOpen(false)} />
        </div>
    );
};

const MissionControlWrapper: React.FC = () => (
    <UndoRedoProvider>
        <MissionControl />
    </UndoRedoProvider>
);

export default MissionControlWrapper;