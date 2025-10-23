import React, { useState } from 'react';
import Loader from './Loader';
import { ShuntAction } from '../types';

interface ShuntButtonProps {
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
  children: React.ReactNode;
  action: ShuntAction;
  onDragStart: (e: React.DragEvent<HTMLButtonElement>, action: ShuntAction) => void;
  onDrop: (e: React.DragEvent<HTMLButtonElement>, action: ShuntAction) => void;
}

const ShuntButton: React.FC<ShuntButtonProps> = ({ 
  onClick, 
  disabled, 
  isActive, 
  children, 
  action,
  onDragStart,
  onDrop
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
      className={`
        flex items-center justify-center gap-2 text-sm text-center p-3 rounded-md
        border transition-all duration-200 relative
        ${
          isActive
            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
            : 'bg-gray-700/30 border-gray-600/50 text-gray-300 hover:bg-gray-700/60 hover:border-gray-500'
        }
        ${
          isDragOver ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-800' : ''
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isActive ? <Loader /> : children}
    </button>
  );
};

export default ShuntButton;