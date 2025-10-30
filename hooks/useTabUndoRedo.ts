// hooks/useTabUndoRedo.ts
import { useEffect } from 'react';
import { useUndoRedo } from './useUndoRedo';
import { useUndoRedoContext } from '../context/UndoRedoContext';
import { useActiveTab } from '../context/ActiveTabContext';
// FIX: Corrected import path to be relative to the project root.
import { MissionControlTabKey } from '../types';

export const useTabUndoRedo = <T>(initialState: T, myTabKey: MissionControlTabKey) => {
    const { state, set, undo, redo, reset, canUndo, canRedo } = useUndoRedo(initialState);
    const { register, unregister } = useUndoRedoContext();
    const activeTabKey = useActiveTab();
    
    const isActive = activeTabKey === myTabKey;
    
    useEffect(() => {
        if (isActive) {
            register({ undo, redo, canUndo, canRedo });
        }
        
        // This effect's cleanup function will run when `isActive` changes,
        // effectively unregistering the actions of the tab that is becoming inactive.
        return () => {
            if (isActive) {
                unregister();
            }
        };

    }, [isActive, register, unregister, undo, redo, canUndo, canRedo]);
    
    return { state, set, reset };
};