// context/ActiveTabContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
// FIX: Corrected import path to be relative to the project root.
import { MissionControlTabKey } from '../types';

const ActiveTabContext = createContext<MissionControlTabKey | null>(null);

export const ActiveTabProvider: React.FC<{ activeTab: MissionControlTabKey; children: ReactNode }> = ({ activeTab, children }) => (
    <ActiveTabContext.Provider value={activeTab}>
        {children}
    </ActiveTabContext.Provider>
);

export const useActiveTab = (): MissionControlTabKey | null => {
    return useContext(ActiveTabContext);
};