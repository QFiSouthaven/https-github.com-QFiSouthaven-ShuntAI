// context/MiaContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MiaMessage, MiaAlert } from '../features/mia/miaTypes';
import { GeminiResponse } from '../types';
import { appEventBus } from '../lib/eventBus';
import { getMiaChatResponse, getMiaErrorAnalysis, generateCodeFixPlan } from '../features/mia/MiaService';
import { logFrontendError, ErrorSeverity } from '../utils/errorLogger';
import { useMCPContext } from './MCPContext';
import { INITIAL_DOCUMENTATION } from './constants';
import { audioService } from '../services/audioService';

interface MiaContextType {
  messages: MiaMessage[];
  alerts: MiaAlert[];
  isLoading: boolean;
  isApplyingFix: boolean;
  activePlan: GeminiResponse | null;
  sendMessage: (messageText: string) => void;
  diagnoseLastError: () => void;
  generateFixAttempt: (error: MiaAlert) => void;
  applyFix: () => void;
  addMessage: (message: MiaMessage) => void;
  addAlert: (alert: MiaAlert) => void;
  clearAlerts: () => void;
}

const MiaContext = createContext<MiaContextType | undefined>(undefined);

export const MiaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<MiaMessage[]>([
        { id: uuidv4(), sender: 'mia', text: "Hello! I'm Mia, your application assistant. How can I help you?", timestamp: new Date().toISOString() }
    ]);
    const [alerts, setAlerts] = useState<MiaAlert[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isApplyingFix, setIsApplyingFix] = useState<boolean>(false);
    const [activePlan, setActivePlan] = useState<GeminiResponse | null>(null);
    const { extensionApi } = useMCPContext();

    const addMessage = useCallback((message: MiaMessage) => {
        setMessages(prev => [...prev, message]);
    }, []);

    const addAlert = useCallback((alert: MiaAlert) => {
        setAlerts(prev => [alert, ...prev]);
        audioService.playSound('notification');
    }, []);
    
    const clearAlerts = useCallback(() => setAlerts([]), []);

    useEffect(() => {
        const unsubscribeAlerts = appEventBus.on('mia-alert', addAlert);
        const unsubscribeTelemetry = appEventBus.on('telemetry', (payload) => {
            // Here you could forward Mia's internal telemetry to a backend if needed
            console.log("Mia Telemetry Captured:", payload);
        });

        return () => {
            unsubscribeAlerts();
            unsubscribeTelemetry();
        };
    }, [addAlert]);

    const sendMessage = useCallback(async (messageText: string) => {
        const userMessage: MiaMessage = {
            id: uuidv4(),
            sender: 'user',
            text: messageText,
            timestamp: new Date().toISOString(),
        };
        addMessage(userMessage);
        audioService.playSound('send');
        setIsLoading(true);

        try {
            // Prepare history for the AI
            const history = messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            const responseText = await getMiaChatResponse(history, messageText);

            addMessage({
                id: uuidv4(),
                sender: 'mia',
                text: responseText,
                timestamp: new Date().toISOString(),
            });
            audioService.playSound('receive');
        } catch (error) {
            addMessage({
                id: uuidv4(),
                sender: 'system-error',
                text: "I'm sorry, I'm having trouble connecting to my core intelligence. Please try again later.",
                timestamp: new Date().toISOString(),
            });
            audioService.playSound('error');
        } finally {
            setIsLoading(false);
        }
    }, [messages, addMessage]);

    const diagnoseLastError = useCallback(async () => {
        const lastCriticalError = alerts.find(a => a.severity === 'critical');

        if (!lastCriticalError || !lastCriticalError.context) {
            addMessage({ id: uuidv4(), sender: 'mia', text: "I couldn't find any recent critical errors to analyze.", timestamp: new Date().toISOString() });
            return;
        }
        
        addMessage({ id: uuidv4(), sender: 'mia', text: `Analyzing the following error: "${lastCriticalError.title}"...`, timestamp: new Date().toISOString() });
        setIsLoading(true);

        try {
            const analysis = await getMiaErrorAnalysis(lastCriticalError.context);
            addMessage({ id: uuidv4(), sender: 'mia', text: analysis, timestamp: new Date().toISOString(), diagnosableError: lastCriticalError });
            audioService.playSound('success');
        } catch (error) {
            logFrontendError(error, ErrorSeverity.High, { context: 'Mia.diagnoseLastError' });
            addMessage({ id: uuidv4(), sender: 'system-error', text: "I'm sorry, I encountered a problem while trying to analyze the error.", timestamp: new Date().toISOString() });
            audioService.playSound('error');
        } finally {
            setIsLoading(false);
        }
    }, [alerts, addMessage]);

    const generateFixAttempt = useCallback(async (error: MiaAlert) => {
        if (!error.context) return;
        addMessage({ id: uuidv4(), sender: 'mia', text: "Ok, I'll attempt to generate a code fix for that error. Analyzing...", timestamp: new Date().toISOString() });
        setIsLoading(true);
        setActivePlan(null);

        try {
            const plan = await generateCodeFixPlan(error.context, INITIAL_DOCUMENTATION.geminiContext);
            setActivePlan(plan);
            addMessage({
                id: uuidv4(),
                sender: 'mia',
                text: "I've formulated a potential fix. Please review the proposed file changes below. If you approve, I can apply them directly to your project files.",
                timestamp: new Date().toISOString(),
                fixProposal: plan,
            });
            audioService.playSound('success');
        } catch (e) {
            logFrontendError(e, ErrorSeverity.High, { context: 'Mia.generateFixAttempt' });
            addMessage({ id: uuidv4(), sender: 'system-error', text: "Sorry, I was unable to generate a code fix. The AI returned an error.", timestamp: new Date().toISOString() });
            audioService.playSound('error');
        } finally {
            setIsLoading(false);
        }
    }, [addMessage]);
    
    const applyFix = useCallback(async () => {
        if (!activePlan) return;
        if (!extensionApi?.fs) {
            addMessage({ id: uuidv4(), sender: 'system-error', text: "I can't apply the fix because the Browser Extension with File System Access is not connected. Please connect it in the Settings tab.", timestamp: new Date().toISOString() });
            audioService.playSound('error');
            return;
        }

        setIsApplyingFix(true);
        const { implementationTasks } = activePlan;

        for (const task of implementationTasks) {
            if (task.filePath && task.newContent) {
                try {
                    addMessage({ id: uuidv4(), sender: 'system-progress', text: `Writing changes to ${task.filePath}...`, timestamp: new Date().toISOString() });
                    await extensionApi.fs.saveFile(task.filePath, task.newContent);
                    await new Promise(res => setTimeout(res, 500)); // small delay for UI
                } catch (e) {
                    logFrontendError(e, ErrorSeverity.Critical, { context: 'Mia.applyFix', file: task.filePath });
                    addMessage({ id: uuidv4(), sender: 'system-error', text: `Failed to write file: ${task.filePath}. Aborting fix.`, timestamp: new Date().toISOString() });
                    setIsApplyingFix(false);
                    audioService.playSound('error');
                    return;
                }
            }
        }
        addMessage({ id: uuidv4(), sender: 'mia', text: "All file changes have been successfully applied. Please review the files in your editor.", timestamp: new Date().toISOString() });
        setIsApplyingFix(false);
        setActivePlan(null);
        audioService.playSound('success');
    }, [activePlan, extensionApi, addMessage]);


    const value = { messages, alerts, isLoading, isApplyingFix, activePlan, sendMessage, diagnoseLastError, generateFixAttempt, applyFix, addMessage, addAlert, clearAlerts };

    return (
        <MiaContext.Provider value={value}>
            {children}
        </MiaContext.Provider>
    );
};

export const useMiaContext = (): MiaContextType => {
    const context = useContext(MiaContext);
    if (!context) {
        throw new Error('useMiaContext must be used within a MiaProvider');
    }
    return context;
};