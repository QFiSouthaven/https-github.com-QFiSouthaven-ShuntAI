// context/UndoRedoContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface UndoRedoActions {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

interface UndoRedoContextType extends UndoRedoActions {
    register: (actions: UndoRedoActions) => void;
    unregister: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

// A "fulcrum" or null-object pattern to avoid errors when no actions are registered.
const FULCRUM: UndoRedoActions = { undo: () => {}, redo: () => {}, canUndo: false, canRedo: false };

export const UndoRedoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [actions, setActions] = useState<UndoRedoActions>(FULCRUM);

    const register = useCallback((newActions: UndoRedoActions) => {
        setActions(newActions);
    }, []);

    const unregister = useCallback(() => {
        setActions(FULCRUM);
    }, []);

    const value = { ...actions, register, unregister };

    return (
        <UndoRedoContext.Provider value={value}>
            {children}
        </UndoRedoContext.Provider>
    );
};

export const useUndoRedoContext = (): UndoRedoContextType => {
    const context = useContext(UndoRedoContext);
    if (!context) {
        throw new Error('useUndoRedoContext must be used within an UndoRedoProvider');
    }
    return context;
};