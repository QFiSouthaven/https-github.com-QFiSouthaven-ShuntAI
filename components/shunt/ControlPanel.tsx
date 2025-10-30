import React from 'react';
// FIX: Corrected import path to be relative to the project root.
import { ShuntAction } from '../../types';
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
    DocumentChartBarIcon
} from '../icons';

interface ControlPanelProps {
  onShunt: (action: ShuntAction) => void;
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


const ControlPanel: React.FC<ControlPanelProps> = ({ onShunt, onCombinedShunt, isLoading, activeShunt, selectedModel, onModelChange }) => {
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

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 flex flex-col h-full shadow-lg relative">
      <div className="p-3 border-b border-gray-700/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-fuchsia-400" />
            <h2 className="font-semibold text-gray-300">Shunt Actions</h2>
        </div>
        <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isLoading}
            className="bg-gray-700/50 border border-gray-600 text-xs text-gray-200 rounded-md pl-2 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 transition-colors duration-200 hover:border-gray-500"
            aria-label="Select AI model"
        >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>
      <div className="p-4 flex-grow overflow-y-auto">
        {actionGroups.map(group => {
            const actionsInGroup = shuntActionsConfig.filter(c => c.group === group);
            if (actionsInGroup.length === 0) return null;
            return (
                <div key={group} className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {actionsInGroup.map(({ action, icon }) => (
                        <ShuntButton
                            key={action}
                            action={action}
                            onClick={() => onShunt(action)}
                            disabled={isLoading}
                            isActive={isLoading && (activeShunt?.includes(action) ?? false)}
                            onDragStart={handleDragStart}
                            onDrop={handleDrop}
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
  );
};

export default ControlPanel;