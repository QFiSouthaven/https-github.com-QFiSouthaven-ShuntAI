// components/developers/Toolbar.tsx
import React from 'react';
import { DeviceFloppyIcon, CopyIcon, ClipboardDocumentIcon, DocumentDuplicateIcon } from '../icons';

interface ToolbarProps {
    onSave: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onDuplicate: () => void;
}

const ToolbarButton: React.FC<{ onClick: () => void; children: React.ReactNode; title: string }> = ({ onClick, children, title }) => (
    <button
        onClick={onClick}
        title={title}
        className="p-2 rounded-md hover:bg-gray-700/80 transition-colors text-gray-300"
    >
        {children}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ onSave, onCopy, onPaste, onDuplicate }) => {
    return (
        <div className="flex items-center gap-1 bg-gray-800/50 border border-gray-700/50 rounded-lg p-1">
            <ToolbarButton onClick={onSave} title="Save Snapshot (to Chronicle)">
                <DeviceFloppyIcon className="w-5 h-5" />
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-600/50 mx-1"></div>
            <ToolbarButton onClick={onCopy} title="Copy (Ctrl+C)">
                <CopyIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={onPaste} title="Paste (Ctrl+V)">
                <ClipboardDocumentIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={onDuplicate} title="Duplicate (Ctrl+D)">
                <DocumentDuplicateIcon className="w-5 h-5" />
            </ToolbarButton>
        </div>
    );
};

export default Toolbar;