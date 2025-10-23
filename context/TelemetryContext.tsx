// context/TelemetryContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { TelemetryService } from '../services/telemetry.service';
import { VersionControlService } from '../services/versionControl.service';
import { GlobalTelemetryContext, TelemetryConfig } from '../types/telemetry';

interface TelemetryContextType {
    telemetryService: TelemetryService | null;
    versionControlService: VersionControlService | null;
    globalContext: GlobalTelemetryContext;
    updateTelemetryContext: (newContext: Partial<GlobalTelemetryContext>) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

interface TelemetryProviderProps {
    children: React.ReactNode;
    initialGlobalContext: GlobalTelemetryContext;
    config?: Partial<TelemetryConfig>;
}

export const TelemetryProvider: React.FC<TelemetryProviderProps> = ({
    children,
    initialGlobalContext,
    config,
}) => {
    const [currentGlobalContext, setCurrentGlobalContext] = useState<GlobalTelemetryContext>(initialGlobalContext);
    const telemetryServiceRef = useRef<TelemetryService | null>(null);
    const versionControlServiceRef = useRef<VersionControlService | null>(null);

    useMemo(() => {
        if (!telemetryServiceRef.current) {
            telemetryServiceRef.current = new TelemetryService(currentGlobalContext, config);
            console.log('TelemetryService initialized.');
        } else {
            telemetryServiceRef.current.updateGlobalContext(currentGlobalContext);
        }

        if (telemetryServiceRef.current && !versionControlServiceRef.current) {
            versionControlServiceRef.current = new VersionControlService(telemetryServiceRef.current);
            console.log('VersionControlService initialized.');
        }
    }, [currentGlobalContext, config]);

    const updateTelemetryContext = useCallback((newContext: Partial<GlobalTelemetryContext>) => {
        setCurrentGlobalContext(prevContext => ({ ...prevContext, ...newContext }));
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            telemetryServiceRef.current?.flushOnUnload();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const contextValue = useMemo(() => ({
        telemetryService: telemetryServiceRef.current,
        versionControlService: versionControlServiceRef.current,
        globalContext: currentGlobalContext,
        updateTelemetryContext,
    }), [updateTelemetryContext, currentGlobalContext]);

    return (
        <TelemetryContext.Provider value={contextValue}>
            {children}
        </TelemetryContext.Provider>
    );
};

export const useTelemetry = (): TelemetryContextType => {
    const context = useContext(TelemetryContext);
    if (context === undefined) {
        throw new Error('useTelemetry must be used within a TelemetryProvider');
    }
    return context;
};