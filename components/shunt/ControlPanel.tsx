import React, { useState } from 'react';
// FIX: Corrected import path to be relative to the project root.
import { ShuntAction, PromptModuleKey } from '../../types';
import ShuntButton from './ShuntButton';
import { 
    BookIcon, 
    CodeIcon, 
    EditIcon, 
    GlobeIcon, 
    JsonIcon, 
    KeywordsIcon, 
    SmileIcon, 
    TieIcon, 
    SparklesIcon,
    AmplifyIcon,
    BrainIcon,
    FeatherIcon,
    JsonToTextIcon,
    ActionableIcon,
    PuzzlePieceIcon,
    PhotoIcon,
    EntityIcon,
    DocumentChartBarIcon,
    BranchingIcon,
    GlobeAltIcon,
    BoltIcon
} from '../icons';
import { shuntActionDescriptions, promptModules } from '../../services/prompts';
import ToggleSwitch from '../common/ToggleSwitch';

interface ControlPanelProps {
  onShunt: (action: ShuntAction) => void;
  onModularShunt: (modules: Set<PromptModuleKey>) => void;
  onCombinedShunt: (draggedAction: ShuntAction, targetAction: ShuntAction) => void;
  isLoading: boolean;
  activeShunt: string | null;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const shuntActionsConfig = [
  { action: ShuntAction.SUMMARIZE, icon: <BookIcon className="w-5 h-5" />, group: 'Content' },
  { action: ShuntAction.AMPLIFY, icon: <AmplifyIcon className="w-5 h-5" />, group: 'Content' },
  { action: ShuntAction.MAKE_ACTIONABLE, icon: <ActionableIcon className="w-5 h-5" />, group: 'Content' },
  { action: ShuntAction.BUILD_A_SKILL, icon: <PuzzlePieceIcon className="w-5 h-5" />, group: 'Content' },
  { action: ShuntAction.MY_COMMAND, icon: <BranchingIcon className="w-5 h-5" />, group: 'Content' },
  { action: ShuntAction.GENERATE_ORACLE_QUERY, icon: <GlobeAltIcon className="w-5 h-5" />, group: 'Content' },
  { action: ShuntAction.EXPLAIN_LIKE_IM_FIVE, icon: <CodeIcon className="w-5 h-5" />, group: 'Explanation' },
  { action: ShuntAction.EXPLAIN_LIKE_A_SENIOR, icon: <BrainIcon className="w-5 h-5" />, group: 'Explanation' },
  { action: ShuntAction.EXTRACT_KEYWORDS, icon: <KeywordsIcon className="w-5 h-5" />, group: 'Keywords' },
  { action: ShuntAction.EXTRACT_ENTITIES, icon: <EntityIcon className="w-5 h-5" />, group: 'Keywords' },
  { action: ShuntAction.ENHANCE_WITH_KEYWORDS, icon: <FeatherIcon className="w-5 h-5" />, group: 'Keywords' },
  { action: ShuntAction.CHANGE_TONE_FORMAL, icon: <TieIcon className="w-5 h-5" />, group: 'Tone' },
  { action: ShuntAction.CHANGE_TONE_CASUAL, icon: <SmileIcon className="w-5 h-5" />, group: 'Tone' },
  { action: ShuntAction.PROOFREAD, icon: <EditIcon className="w-5 h-5" />, group: 'Quality' },
  { action: ShuntAction.TRANSLATE_SPANISH, icon: <GlobeIcon className="w-5 h-5" />, group: 'Quality' },
  { action: ShuntAction.FORMAT_JSON, icon: <JsonIcon className="w-5 h-5" />, group: 'Data' },
  { action: ShuntAction.PARSE_JSON, icon: <JsonToTextIcon className="w-5 h-5" />, group: 'Data' },
  { action: ShuntAction.INTERPRET_SVG, icon: <PhotoIcon className="w-5 h-5" />, group: 'Data' },
  { action: ShuntAction.GENERATE_VAM_PRESET, icon: <DocumentChartBarIcon className="w-5 h-5" />, group: 'Data' },
];

const actionGroups = ['Content', 'Explanation', 'Keywords', 'Tone', 'Quality', 'Data'];


const ControlPanel: React.FC<ControlPanelProps> = ({ onShunt, onModularShunt, onCombinedShunt, isLoading, activeShunt, selectedModel, onModelChange }) => {
  const [selectedModules, setSelectedModules] = useState<Set<PromptModuleKey>>(new Set());
  
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, action: ShuntAction) => {
    e.dataTransfer.setData('text/plain', action);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDrop = (e: React.DragEvent<HTMLButtonElement>, targetAction: ShuntAction) => {
    const draggedAction = e.dataTransfer.getData('text/plain') as ShuntAction;
    if (draggedAction && draggedAction !== targetAction) {
      onCombinedShunt(draggedAction, targetAction);
    }
  };

  const handleModuleToggle = (moduleKey: PromptModuleKey, checked: boolean) => {
    setSelectedModules(prev => {
        const newSet = new Set(prev);
        if (checked) {
            newSet.add(moduleKey);
        } else {
            newSet.delete(moduleKey);
        }
        return newSet;
    });
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 flex flex-col h-full shadow-lg relative">
        <div className="p-4 flex-grow overflow-y-auto">

        {/* Modular Prompt Engine */}
        <div className="mb-6 bg-gray-900/40 border border-gray-700/60 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
                <BrainIcon className="w-6 h-6 text-fuchsia-400" />
                <h2 className="font-semibold text-gray-200 text-lg">Modular Prompt Engine</h2>
            </div>
            <div className="space-y-3 mb-4">
                {Object.entries(promptModules).map(([key, module]) => {
                    if (key === PromptModuleKey.CORE) return null; // Core is always on, not selectable
                    return (
                        <div key={key} title={module.description}>
                            <ToggleSwitch
                                id={`module-toggle-${key}`}
                                label={module.name}
                                checked={selectedModules.has(key as PromptModuleKey)}
                                onChange={(checked) => handleModuleToggle(key as PromptModuleKey, checked)}
                                disabled={isLoading}
                            />
                        </div>
                    );
                })}
            </div>
            <button
                onClick={() => onModularShunt(selectedModules)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 text-md font-semibold text-center p-3 rounded-md border transition-all duration-200 bg-fuchsia-600/80 border-fuchsia-500 text-white shadow-lg hover:bg-fuchsia-600 hover:border-fuchsia-400 hover:shadow-fuchsia-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <BoltIcon className="w-5 h-5" />
                Execute Modular Prompt
            </button>
        </div>

        <div className="w-full h-px bg-gray-700/50 my-6"></div>

        {/* Shunt Actions */}
        <div>
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-cyan-400" />
                    <h2 className="font-semibold text-gray-300">Shunt Actions</h2>
                </div>
                <select
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    disabled={isLoading}
                    className="bg-gray-700/50 border border-gray-600 text-xs text-gray-200 rounded-md pl-2 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors duration-200 hover:border-gray-500"
                    aria-label="Select AI model"
                    title="Select the Gemini model for simple Shunt Actions."
                >
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
            </div>
            {actionGroups.map(group => {
                const actionsInGroup = shuntActionsConfig.filter(c => c.group === group);
                if (actionsInGroup.length === 0) return null;
                return (
                    <div key={group} className="mb-4">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {actionsInGroup.map(({ action, icon }) => (
                            <ShuntButton
                                key={action}
                                action={action}
                                onClick={() => onShunt(action)}
                                disabled={isLoading}
                                isActive={isLoading && (activeShunt?.includes(action) ?? false)}
                                onDragStart={handleDragStart}
                                onDrop={handleDrop}
                                tooltip={shuntActionDescriptions[action]}
                            >
                                {icon}
                                {action}
                            </ShuntButton>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
