// context/MiaContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MiaMessage, MiaAlert, GeminiResponse } from '../types';
import { appEventBus } from '../lib/eventBus';
import { getMiaChatResponse, getMiaErrorAnalysis, generateCodeFixPlan } from '../services/miaService';
import { logFrontendError, ErrorSeverity } from '../utils/errorLogger';
import { useMCPContext } from './MCPContext';
import { INITIAL_DOCUMENTATION } from './constants';
import { audioService } from '../services/audioService';
import { MCPConnectionStatus } from '../types/mcp';

interface MiaContextType {
  messages: MiaMessage[];
  alerts: MiaAlert[];
  isLoading: boolean;
  isApplyingFix: boolean;
  isGeneratingPlan: boolean;
  agentLog: string[];
  activePlan: GeminiResponse | null;
  activeTab: string | null;
  sendMessage: (messageText: string) => void;
  diagnoseLastError: () => void;
  generateFixAttempt: (error: MiaAlert) => void;
  applyFix: () => void;
  addMessage: (message: MiaMessage) => void;
  addAlert: (alert: MiaAlert) => void;
  clearAlerts: () => void;
}

const MiaContext = createContext<MiaContextType | undefined>(undefined);

const MIA_MESSAGES_STORAGE_KEY = 'mia-chat-history';

const loadMessages = (): MiaMessage[] => {
    try {
        const storedMessages = localStorage.getItem(MIA_MESSAGES_STORAGE_KEY);
        if (storedMessages) {
            return JSON.parse(storedMessages);
        }
    } catch (error) {
        console.error("Failed to load Mia's messages from localStorage", error);
    }
    // Return default message if nothing is stored or loading fails
    return [{ id: uuidv4(), sender: 'mia', text: "Hello! I'm Mia, your application assistant. How can I help you?", timestamp: new Date().toISOString() }];
};


export const MiaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<MiaMessage[]>(loadMessages);
    const [alerts, setAlerts] = useState<MiaAlert[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isApplyingFix, setIsApplyingFix] = useState<boolean>(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
    const [agentLog, setAgentLog] = useState<string[]>([]);
    const [activePlan, setActivePlan] = useState<GeminiResponse | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const { extensionApi, status } = useMCPContext();

    useEffect(() => {
        try {
            localStorage.setItem(MIA_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save Mia's messages to localStorage", error);
        }
    }, [messages]);

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
            if (payload.type === 'tab_change' && payload.data.tab) {
                setActiveTab(payload.data.tab);
            }
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
        
        setIsGeneratingPlan(true);
        setActivePlan(null);
        setAgentLog([]); // Clear previous logs

        try {
            const plan = await generateCodeFixPlan(error.context, INITIAL_DOCUMENTATION.geminiContext);
            
            // Simulate streaming the monologue for a "real-time" augmented effect
            if (plan.internalMonologue) {
                const lines = plan.internalMonologue.split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    setAgentLog(prev => [...prev, line]);
                    await new Promise(res => setTimeout(res, 150)); // Delay for streaming effect
                }
            }
             await new Promise(res => setTimeout(res, 500)); // Final delay before showing proposal

            setActivePlan(plan);
            addMessage({
                id: uuidv4(),
                sender: 'mia',
                text: "I've formulated a potential fix based on my analysis. Please review the proposed file changes below. If you approve, I can apply them.",
                timestamp: new Date().toISOString(),
                fixProposal: plan,
            });
            audioService.playSound('success');
        } catch (e) {
            logFrontendError(e, ErrorSeverity.High, { context: 'Mia.generateFixAttempt' });
            addMessage({ id: uuidv4(), sender: 'system-error', text: "Sorry, I was unable to generate a code fix. The AI returned an error.", timestamp: new Date().toISOString() });
            audioService.playSound('error');
        } finally {
            setIsGeneratingPlan(false);
        }
    }, [addMessage]);
    
    const applyFix = useCallback(async () => {
        if (!activePlan) return;
        if (status !== MCPConnectionStatus.Connected || !extensionApi?.fs) {
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
                    const errorContext = { context: 'Mia.applyFix', file: task.filePath };
                    logFrontendError(e, ErrorSeverity.Critical, errorContext);
                    
                    addMessage({ id: uuidv4(), sender: 'system-error', text: `Failed to write file: ${task.filePath}. Aborting fix.`, timestamp: new Date().toISOString() });
                    
                    addMessage({ 
                        id: uuidv4(), 
                        sender: 'mia', 
                        text: "My attempt to apply the fix failed while writing a file. I have created a new critical alert with the failure details. You can use the 'Diagnose Last Error' button to investigate this new problem.", 
                        timestamp: new Date().toISOString() 
                    });

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
    }, [activePlan, extensionApi, status, addMessage]);


    const value = { messages, alerts, isLoading, isApplyingFix, isGeneratingPlan, agentLog, activePlan, activeTab, sendMessage, diagnoseLastError, generateFixAttempt, applyFix, addMessage, addAlert, clearAlerts };

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