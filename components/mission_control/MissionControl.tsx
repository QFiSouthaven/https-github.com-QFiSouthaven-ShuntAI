import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MissionControlTab, MissionControlTabKey } from '../../types';
import Shunt from '../shunt/Shunt';
import Orchestrator from './Orchestrator';
import TrimAgent from '../trim_agent/TrimAgent';
import Weaver from '../weaver/Weaver';
import Chat from '../chat/Chat';
import AIChat from '../ai_chat/AIChat';
import ImageAnalysis from '../image_analysis/ImageAnalysis';
import AnthropicChat from '../anthropic_chat/AnthropicChat';
import Settings from '../settings/Settings';
import Chronicle from '../chronicle/Chronicle';
import Developers from '../developers/Developers';
import { ShuntIcon, BranchingIcon, WeaverIcon, ChatIcon, CogIcon, MailboxIcon, HistoryIcon, UndoIcon, RedoIcon, AnthropicIcon, DeveloperIcon, PhotoIcon, TrimIcon } from '../icons';
import { useMailbox } from '../../context/MailboxContext';
import MailboxModal from '../weaver/MailboxModal';
import { UndoRedoProvider, useUndoRedoContext } from '../../context/UndoRedoContext';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import ErrorBoundary from '../ErrorBoundary';
import { audioService } from '../../services/audioService';

const MissionControlContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MissionControlTabKey>(MissionControlTabKey.Shunt);
  const { unreadCount } = useMailbox();
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const { undo, redo, canUndo, canRedo } = useUndoRedoContext();
  const headerRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef<MissionControlTabKey>(activeTab);
  
  const tabs: MissionControlTab[] = useMemo(() => [
    { key: MissionControlTabKey.Shunt, label: 'Content Shunt', icon: <ShuntIcon className="w-5 h-5" />, ContentComponent: Shunt },
    { key: MissionControlTabKey.Orchestrator, label: 'System Orchestrator', icon: <BranchingIcon className="w-5 h-5" />, ContentComponent: Orchestrator },
    { key: MissionControlTabKey.TrimAgent, label: 'Trim Agent', icon: <TrimIcon className="w-5 h-5" />, ContentComponent: TrimAgent },
    { key: MissionControlTabKey.Weaver, label: 'Agentic Weaver', icon: <WeaverIcon className="w-5 h-5" />, ContentComponent: Weaver },
    { key: MissionControlTabKey.Chat, label: 'AI Chat', icon: <ChatIcon className="w-5 h-5" />, ContentComponent: Chat },
    { key: MissionControlTabKey.ContextualChat, label: 'Contextual Chat', icon: <ChatIcon className="w-5 h-5" />, ContentComponent: AIChat },
    { key: MissionControlTabKey.ImageAnalysis, label: 'Image Analysis', icon: <PhotoIcon className="w-5 h-5" />, ContentComponent: ImageAnalysis },
    { key: MissionControlTabKey.AnthropicChat, label: 'Anthropic Chat', icon: <AnthropicIcon className="w-5 h-5" />, ContentComponent: AnthropicChat },
    { key: MissionControlTabKey.Chronicle, label: 'App Chronicle', icon: <HistoryIcon className="w-5 h-5" />, ContentComponent: Chronicle },
    { key: MissionControlTabKey.Developers, label: 'Developers', icon: <DeveloperIcon className="w-5 h-5" />, ContentComponent: Developers },
    { key: MissionControlTabKey.Settings, label: 'Global Settings', icon: <CogIcon className="w-5 h-5" />, ContentComponent: Settings },
  ], []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isUndo = (isMac ? event.metaKey : event.ctrlKey) && !event.shiftKey && event.key === 'z';
        const isRedo = (isMac ? event.metaKey && event.shiftKey && event.key === 'z' : event.ctrlKey && event.key === 'y');

        if (isUndo) {
            event.preventDefault();
            if (canUndo) undo();
        } else if (isRedo) {
            event.preventDefault();
            if (canRedo) redo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
  
  useEffect(() => {
    if (headerRef.current && prevTabRef.current !== activeTab) {
        headerRef.current.classList.add('header-glow');
        const timer = setTimeout(() => {
            headerRef.current?.classList.remove('header-glow');
        }, 500); // Animation duration
        prevTabRef.current = activeTab;
        return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const handleTabClick = (tabKey: MissionControlTabKey) => {
    if (activeTab !== tabKey) {
        audioService.playSound('tab_switch');
    }
    setActiveTab(tabKey);
  };

  return (
    <>
      <MailboxModal isOpen={isMailboxOpen} onClose={() => setIsMailboxOpen(false)} />
      <div className="mission-control-container max-w-7xl mx-auto border border-gray-700/50 rounded-lg bg-gray-900/70 text-gray-200 flex flex-col min-h-[85vh] w-full">
        <header className="p-5 border-b border-gray-600 bg-gray-800 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShuntIcon className="w-8 h-8 mr-3 text-cyan-400 flex-shrink-0" />
            <div ref={headerRef} className="relative">
                <select
                    value={activeTab}
                    onChange={(e) => handleTabClick(e.target.value as MissionControlTabKey)}
                    className="appearance-none cursor-pointer bg-gray-700/50 border border-gray-600 text-2xl font-bold text-gray-100 rounded-md pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors duration-200 hover:border-gray-500"
                    aria-label="Select a mission control tab"
                >
                    {tabs.map(tab => (
                        <option key={tab.key} value={tab.key} className="font-bold bg-gray-800 text-gray-200">
                            {tab.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={undo}
                disabled={!canUndo}
                className="p-2 rounded-full hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Undo"
            >
                <UndoIcon className="w-6 h-6 text-gray-300" />
            </button>
             <button
                onClick={redo}
                disabled={!canRedo}
                className="p-2 rounded-full hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Redo"
            >
                <RedoIcon className="w-6 h-6 text-gray-300" />
            </button>
            <div className="w-px h-6 bg-gray-600 mx-2"></div>
            <button
              onClick={() => setIsMailboxOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label={`Open Mailbox (${unreadCount} unread)`}
            >
              <MailboxIcon className="w-6 h-6 text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-gray-800">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-grow bg-gray-800/50 rounded-b-lg overflow-hidden relative" role="tabpanel">
           <ActiveTabProvider activeTab={activeTab}>
            {tabs.map(tab => (
              <div
                key={tab.key}
                // Use CSS to hide/show tabs instead of mounting/unmounting
                // This preserves the state of each tab component
                style={{ display: activeTab === tab.key ? 'block' : 'none', height: '100%' }}
                role="tabpanel"
                aria-hidden={activeTab !== tab.key}
              >
                {tab.key === MissionControlTabKey.Chat ? (
                  <ErrorBoundary>
                    <tab.ContentComponent />
                  </ErrorBoundary>
                ) : (
                  <tab.ContentComponent />
                )}
              </div>
            ))}
          </ActiveTabProvider>
        </main>
      </div>
    </>
  );
};


const MissionControl: React.FC = () => (
    <UndoRedoProvider>
        <MissionControlContent />
    </UndoRedoProvider>
);

export default MissionControl;