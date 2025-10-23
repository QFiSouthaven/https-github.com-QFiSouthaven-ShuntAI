import React, { useState, useCallback, useEffect } from 'react';
import { ShuntAction } from '../../types';
import { performShunt } from '../../services/geminiService';
import { useTelemetry } from '../../context/TelemetryContext';
import InputPanel from '../InputPanel';
import ControlPanel from '../ControlPanel';
import OutputPanel from '../OutputPanel';
import { useValidation } from '../../hooks/useValidation';
import TabFooter from '../common/TabFooter';
import { useTabUndoRedo } from '../../hooks/useTabUndoRedo';
import { MissionControlTabKey } from '../../types';
import { parseSkillPackagePlan } from '../../services/skillParser';
import { useMailbox } from '../../context/MailboxContext';
import { audioService } from '../../services/audioService';

const DEMO_TEXT = `React is a free and open-source front-end JavaScript library for building user interfaces based on components. It is maintained by Meta and a community of individual developers and companies.

React can be used as a base in the development of single-page, mobile, or server-rendered applications with frameworks like Next.js. Because React is only concerned with the user interface and rendering components to the DOM, React applications often rely on libraries for routing and other client-side functionality.`;

const MAX_INPUT_LENGTH = 1000000;

interface ShuntState {
  inputText: string;
  outputText: string;
}

const Shunt: React.FC = () => {
  const { telemetryService, versionControlService, updateTelemetryContext } = useTelemetry();
  const { deliverFiles } = useMailbox();

  const { state: shuntState, set: setShuntState } = useTabUndoRedo<ShuntState>({
    inputText: '',
    outputText: '',
  }, MissionControlTabKey.Shunt);

  const { inputText, outputText } = shuntState;
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeShunt, setActiveShunt] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  
  const { errors: validationErrors, markAsTouched, reset: resetValidation } = useValidation(
    inputText,
    { maxLength: MAX_INPUT_LENGTH },
    { maxLength: `Input cannot exceed ${MAX_INPUT_LENGTH} characters.` }
  );

  useEffect(() => {
    updateTelemetryContext({ tab: 'Shunt' });
  }, [updateTelemetryContext]);
  
  const handleShunt = useCallback(async (action: ShuntAction) => {
    markAsTouched();
    if (!inputText.trim() || Object.keys(validationErrors).length > 0) {
      if (!inputText.trim()) {
          setError("Input content cannot be empty.");
      } else {
          setError(validationErrors.maxLength || "Please fix the validation errors.");
      }
      return;
    }

    audioService.playSound('send'); // ASMR Feedback for primary action
    setIsLoading(true);
    setError(null);
    setActiveShunt(action);
    setShuntState(s => ({ ...s, outputText: '' }));

    const startTime = Date.now();
    
    telemetryService?.recordEvent({
      eventType: 'user_input',
      interactionType: 'shunt_action',
      tab: 'Shunt',
      userInput: { action, inputTextLength: inputText.length },
      modelUsed: selectedModel,
    });

    try {
      const { resultText, tokenUsage } = await performShunt(inputText, action, selectedModel);
      const latency = Date.now() - startTime;
      
      setShuntState(s => ({ ...s, outputText: resultText }));
      
      if (action === ShuntAction.BUILD_A_SKILL) {
        const files = parseSkillPackagePlan(resultText);
        if (files.length > 0) {
            await deliverFiles(files);
            // Optionally, provide feedback to the user
            console.log(`${files.length} skill files delivered to mailbox.`);
        }
      }

      telemetryService?.recordEvent({
        eventType: 'ai_response',
        interactionType: 'shunt_action',
        tab: 'Shunt',
        userInput: { action },
        aiOutput: { resultTextLength: resultText.length },
        outcome: 'success',
        latency,
        tokenUsage,
        modelUsed: selectedModel
      });
      
      versionControlService?.captureVersion(
          'shunt_interaction',
          'shunt_output',
          JSON.stringify({ input: inputText, output: resultText, action }, null, 2),
          'ai_response',
          `Performed Shunt Action: ${action}`,
          { action, tokenUsage }
      );
      audioService.playSound('success');

    } catch (e: any) {
      const latency = Date.now() - startTime;
      const errorMessage = e.message || 'An unknown error occurred.';
      setError(errorMessage);
      telemetryService?.recordEvent({
        eventType: 'ai_response',
        interactionType: 'shunt_action',
        tab: 'Shunt',
        userInput: { action },
        aiOutput: { error: errorMessage },
        outcome: 'error',
        latency,
        modelUsed: selectedModel,
      });
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
      setActiveShunt(null);
    }
  }, [inputText, telemetryService, versionControlService, deliverFiles, setShuntState, validationErrors, markAsTouched, selectedModel]);
  
  const handleCombinedShunt = useCallback(async (draggedAction: ShuntAction, targetAction: ShuntAction) => {
    markAsTouched();
    if (!inputText.trim() || Object.keys(validationErrors).length > 0) {
      if (!inputText.trim()) {
          setError("Input content cannot be empty.");
      } else {
          setError(validationErrors.maxLength || "Please fix the validation errors.");
      }
      return;
    }

    audioService.playSound('send'); // ASMR Feedback for primary action
    const combinedActionName = `${draggedAction} + ${targetAction}`;
    setIsLoading(true);
    setError(null);
    setActiveShunt(combinedActionName);
    setShuntState(s => ({ ...s, outputText: '' }));

    telemetryService?.recordEvent({
      eventType: 'user_input',
      interactionType: 'shunt_action_combined',
      tab: 'Shunt',
      userInput: { action: combinedActionName, inputTextLength: inputText.length },
      modelUsed: selectedModel,
    });
    
    try {
      // Step 1: Perform dragged action
      const { resultText: firstResult, tokenUsage: firstTokenUsage } = await performShunt(inputText, draggedAction, selectedModel);

      // Step 2: Perform target action on the result of the first
      const { resultText: finalResult, tokenUsage: secondTokenUsage } = await performShunt(firstResult, targetAction, selectedModel);
      
      setShuntState(s => ({ ...s, outputText: finalResult }));

      telemetryService?.recordEvent({
        eventType: 'ai_response',
        interactionType: 'shunt_action_combined',
        tab: 'Shunt',
        userInput: { action: combinedActionName },
        aiOutput: { resultTextLength: finalResult.length },
        outcome: 'success',
        tokenUsage: {
          prompt_tokens: (firstTokenUsage.prompt_tokens ?? 0) + (secondTokenUsage.prompt_tokens ?? 0),
          completion_tokens: (firstTokenUsage.completion_tokens ?? 0) + (secondTokenUsage.completion_tokens ?? 0),
          total_tokens: (firstTokenUsage.total_tokens ?? 0) + (secondTokenUsage.total_tokens ?? 0),
          model: firstTokenUsage.model,
        },
        modelUsed: selectedModel,
      });
      audioService.playSound('success');

    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred during the combined action.';
      setError(errorMessage);
      telemetryService?.recordEvent({
        eventType: 'ai_response',
        interactionType: 'shunt_action_combined',
        tab: 'Shunt',
        userInput: { action: combinedActionName },
        aiOutput: { error: errorMessage },
        outcome: 'error',
        modelUsed: selectedModel,
      });
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
      setActiveShunt(null);
    }
  }, [inputText, telemetryService, setShuntState, validationErrors, markAsTouched, selectedModel]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setError(null);
    setShuntState(s => ({ ...s, inputText: event.target.value }));
  };
  
  const handleInputBlur = () => {
    markAsTouched();
  };
  
  const handlePasteDemo = () => {
    setError(null);
    resetValidation();
    setShuntState({ inputText: DEMO_TEXT, outputText: '' });
  };
  
  const handleFileLoad = (text: string) => {
    setError(null);
    resetValidation();
    setShuntState({ inputText: text, outputText: '' });
  };
  
  const handleClearFile = () => {
    setError(null);
    resetValidation();
    setShuntState({ inputText: '', outputText: '' });
    audioService.playSound('click'); // ASMR feedback for secondary action
  };
  
  return (
    <div className="flex flex-col h-full">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4 md:p-6 flex-grow overflow-hidden">
            <div className="xl:col-span-1 h-full overflow-y-auto">
                <InputPanel
                    value={inputText}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onPasteDemo={handlePasteDemo}
                    onFileLoad={handleFileLoad}
                    onClearFile={handleClearFile}
                    error={validationErrors.maxLength}
                    maxLength={MAX_INPUT_LENGTH}
                />
            </div>
            <div className="xl:col-span-1 h-full overflow-y-auto">
                <ControlPanel
                    onShunt={handleShunt}
                    onCombinedShunt={handleCombinedShunt}
                    isLoading={isLoading}
                    activeShunt={activeShunt}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                />
            </div>
            <div className="xl:col-span-1 h-full overflow-y-auto">
                <OutputPanel
                    text={outputText}
                    isLoading={isLoading}
                    error={error}
                    activeShunt={activeShunt}
                />
            </div>
        </div>
        <TabFooter />
    </div>
  );
};

export default Shunt;
