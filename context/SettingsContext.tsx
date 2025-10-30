// context/SettingsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AppSettings {
    backgroundColor: string;
    miaFontColor: string;
    backgroundImage: string;
    animationsEnabled: boolean;
    audioFeedbackEnabled: boolean;
    developerPanelColor: string;
    miniMapColor: string;
}

const defaultSettings: AppSettings = {
    backgroundColor: '#111827', // dark gray
    miaFontColor: '#22d3ee', // cyan
    backgroundImage: '',
    animationsEnabled: true,
    audioFeedbackEnabled: true,
    developerPanelColor: '#1f2937', // gray-800
    miniMapColor: '#334155', // gray-700
};

const SETTINGS_STORAGE_KEY = 'ai-shunt-settings';

const loadSettings = (): AppSettings => {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
            return { ...defaultSettings, ...JSON.parse(storedSettings) };
        }
    } catch (error) {
        console.warn("Failed to load settings from localStorage:", error);
    }
    return defaultSettings;
};

interface SettingsContextType {
    settings: AppSettings;
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
    resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(loadSettings);

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save settings to localStorage:", error);
        }
    }, [settings]);

    const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prevSettings => ({
            ...prevSettings,
            [key]: value,
        }));
    }, []);
    
    const resetSettings = useCallback(() => {
        setSettings(defaultSettings);
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};