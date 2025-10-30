import React, { useState } from 'react';
import Loader from '../Loader';
// FIX: Corrected import path to be relative to the project root.
import { ShuntAction } from '../../types';

interface ShuntButtonProps {
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
  children: React.ReactNode;
  action: ShuntAction;
  onDragStart: (e: React.DragEvent<HTMLButtonElement>, action: ShuntAction) => void;
  onDrop: (e: React.DragEvent<HTMLButtonElement>, action: ShuntAction) => void;
  tooltip: string;
}

const ShuntButton: React.FC<ShuntButtonProps> = ({ 
  onClick, 
  disabled, 
  isActive, 
  children, 
  action,
  onDragStart,
  onDrop,
  tooltip,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const draggedAction = e.dataTransfer.getData('text/plain') as ShuntAction;
    if (draggedAction && draggedAction !== action) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, action);
  };

  const [icon, text] = React.Children.toArray(children);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, action)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      title={tooltip}
      className={`
        flex items-center justify-center gap-2 text-sm text-center p-3 rounded-md
        border transition-all duration-200
        ${
          isActive
            ? 'bg-gray-700/80 border-fuchsia-500 text-fuchsia-200 cursor-wait ring-2 ring-fuchsia-500 ring-offset-2 ring-offset-gray-800'
            : 'bg-gray-700/30 border-gray-600/50 text-gray-300 shadow-lg hover:bg-gray-700/60 hover:border-gray-500 hover:shadow-fuchsia-500/20 hover:-translate-y-px disabled:opacity-50'
        }
        ${
          isDragOver ? 'ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-gray-800' : ''
        }
        disabled:cursor-not-allowed
      `}
    >
      {isActive ? <Loader /> : icon}
      {text}
    </button>
  );
};

export default ShuntButton;