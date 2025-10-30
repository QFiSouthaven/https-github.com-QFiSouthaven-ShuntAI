// components/developers/ContextMenu.tsx
import React, { useEffect, useRef } from 'react';
import { audioService } from '../../services/audioService';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddNode: (type: string) => void;
}

const nodeTypesToAdd = [
    { type: 'audioSource', label: 'Audio Source' },
    { type: 'uiEvent', label: 'UI Event Trigger' },
    { type: 'rhythmClick', label: 'Rhythm Click' },
    { type: 'audioOutput', label: 'Audio Output' },
];

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onAddNode }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleAddNode = (type: string) => {
        onAddNode(type);
    };

    return (
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className="absolute z-50 w-48 bg-gray-700 rounded-md shadow-lg border border-gray-600"
        >
            <div className="p-1">
                <p className="px-3 py-1 text-xs font-semibold text-gray-400">Add Node</p>
                {nodeTypesToAdd.map(node => (
                    <button
                        key={node.type}
                        onClick={() => handleAddNode(node.type)}
                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-fuchsia-600/50 rounded-sm"
                    >
                        {node.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ContextMenu;