// components/shunt/Shunt.tsx
import React, { useState, useCallback } from 'react';
import InputPanel from './InputPanel';
import ControlPanel from './ControlPanel';
import OutputPanel from './OutputPanel';
import { performShunt, executeModularPrompt } from '../../services/geminiService';
import { ShuntAction, TokenUsage, PromptModuleKey } from '../../types';
import { useValidation } from '../../hooks/useValidation';
import { useTelemetry } from '../../context/TelemetryContext';
import TabFooter from '../common/TabFooter';
import { audioService } from '../../services/audioService';
import { promptModules } from '../../services/prompts';
import { useMailbox } from '../../context/MailboxContext';
import { parseSkillPackagePlan } from '../../services/skillParser';

const DEMO_TEXT = `{
  "id": "001",
  "type": "donut",
  "name": "Cake",
  "ppu": 0.55,
  "batters":
    {
      "batter":
        [
          { "id": "1001", "type": "Regular" },
          { "id": "1002", "type": "Chocolate" },
          { "id": "1003", "type": "Blueberry" },
          { "id": "1004", "type": "Devil's Food" }
        ]
    },
  "topping":
    [
      { "id": "5001", "type": "None" },
      { "id": "5002", "type": "Glazed" },
      { "id": "5005", "type": "Sugar" },
      { "id": "5007", "type": "Powdered Sugar" },
      { "id": "5006", "type": "Chocolate with Sprinkles" },
      { "id": "5003", "type": "Chocolate" },
      { "id": "5004", "type": "Maple" }
    ]
}`;

const MAX_INPUT_LENGTH = 600000;

const Shunt: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeShunt, setActiveShunt] = useState<string | null>(null);
  const [lastTokenUsage, setLastTokenUsage] = useState<TokenUsage | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-pro');
  const [modulesForLastRun, setModulesForLastRun] = useState<string[] | null>(null);


  const { telemetryService, versionControlService } = useTelemetry();
  const { deliverFiles } = useMailbox();

  const { errors, isTouched, isValid, validate, markAsTouched, reset } = useValidation(
    inputText,
    { required: true, maxLength: MAX_INPUT_LENGTH },
    { required: 'Input cannot be empty.', maxLength: `Input cannot exceed ${MAX_INPUT_LENGTH} characters.` }
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  const handleShunt = useCallback(async (action: ShuntAction | string, textToProcess: string = inputText) => {
    markAsTouched();
    validate();
    if (!isValid || isLoading) {
      if (errors.required) setError(errors.required);
      if (errors.maxLength) setError(errors.maxLength);
      return;
    }

    setIsLoading(true);
    setError(null);
    setOutputText('');
    setModulesForLastRun(null);
    setActiveShunt(action);
    audioService.playSound('send');
    
    try {
      const { resultText, tokenUsage } = await performShunt(textToProcess, action as ShuntAction, selectedModel);
      
      if (action === ShuntAction.BUILD_A_SKILL) {
        const files = parseSkillPackagePlan(resultText);
        if (files.length > 0) {
            await deliverFiles(files);
            setOutputText(`✅ Skill package generated successfully!\n\n${files.length} file(s) have been delivered to your Mailbox.\n\nYou can access them via the Mailbox icon in the top-right header.`);
            audioService.playSound('success'); 
        } else {
            setOutputText(`⚠️ Could not parse any files from the AI's response.\n\nThe raw output is shown below for debugging:\n\n---\n\n${resultText}`);
            audioService.playSound('error');
        }
      } else {
        setOutputText(resultText);
        audioService.playSound('receive');
      }
      
      setLastTokenUsage(tokenUsage);
      
      telemetryService?.recordEvent({
        eventType: 'ai_response',
        interactionType: 'shunt_action',
        tab: 'Shunt',
        userInput: textToProcess.substring(0, 200),
        aiOutput: resultText.substring(0, 200),
        outcome: 'success',
        tokenUsage,
        modelUsed: selectedModel,
        customData: { action }
      });
      versionControlService?.captureVersion('shunt_interaction', 'shunt_output', JSON.stringify({ input: textToProcess, output: resultText, action, model: selectedModel, tokenUsage }, null, 2), 'ai_response', `Shunt action: ${action}`);

    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred.';
      setError(errorMessage);
      audioService.playSound('error');
       telemetryService?.recordEvent({
        eventType: 'ai_response',
        interactionType: 'shunt_action',
        tab: 'Shunt',
        outcome: 'error',
        customData: { action, error: errorMessage }
      });
    } finally {
      setIsLoading(false);
      setActiveShunt(null);
    }
  }, [inputText, isLoading, isValid, markAsTouched, validate, errors, telemetryService, selectedModel, versionControlService, deliverFiles]);
  
  const handleModularShunt = useCallback(async (modules: Set<PromptModuleKey>) => {
    markAsTouched();
    validate();
    if (!isValid || isLoading) {
        if (errors.required) setError(errors.required);
        if (errors.maxLength) setError(errors.maxLength);
        return;
    }

    setIsLoading(true);
    setError(null);
    setOutputText('');
    setModulesForLastRun(null);
    const moduleNames = Array.from(modules).map(key => promptModules[key].name);
    setActiveShunt(`Modular Prompt (${moduleNames.length} module${moduleNames.length === 1 ? '' : 's'})`);
    audioService.playSound('send');
    
    try {
        const { resultText, tokenUsage } = await executeModularPrompt(inputText, modules);
        setOutputText(resultText);
        setLastTokenUsage(tokenUsage);
        setModulesForLastRun(['Core Directive', ...moduleNames]);
        audioService.playSound('receive');

        telemetryService?.recordEvent({
            eventType: 'ai_response',
            interactionType: 'modular_shunt_action',
            tab: 'Shunt',
            userInput: inputText.substring(0, 200),
            aiOutput: resultText.substring(0, 200),
            outcome: 'success',
            tokenUsage,
            modelUsed: 'gemini-2.5-pro',
            customData: { modules: Array.from(modules) }
        });

    } catch (e: any) {
        const errorMessage = e.message || 'An unknown error occurred.';
        setError(errorMessage);
        audioService.playSound('error');
        telemetryService?.recordEvent({
            eventType: 'ai_response',
            interactionType: 'modular_shunt_action',
            tab: 'Shunt',
            outcome: 'error',
            customData: { modules: Array.from(modules), error: errorMessage }
        });
    } finally {
        setIsLoading(false);
        setActiveShunt(null);
    }
  }, [inputText, isLoading, isValid, markAsTouched, validate, errors, telemetryService]);


  const handleCombinedShunt = useCallback(async (draggedAction: ShuntAction, targetAction: ShuntAction) => {
    markAsTouched();
    validate();
    if (!isValid || isLoading) return;

    const combinedActionName = `${draggedAction} -> ${targetAction}`;
    setIsLoading(true);
    setError(null);
    setOutputText('');
    setModulesForLastRun(null);
    setActiveShunt(combinedActionName);
    audioService.playSound('send');
    
    let intermediateText = '';
    let finalTokenUsage: TokenUsage | null = null;
    
    try {
        // First action
        const { resultText: firstResult, tokenUsage: firstUsage } = await performShunt(inputText, draggedAction, selectedModel);
        intermediateText = firstResult;
        
        // Second action
        const { resultText: secondResult, tokenUsage: secondUsage } = await performShunt(intermediateText, targetAction, selectedModel);
        
        finalTokenUsage = {
            prompt_tokens: firstUsage.prompt_tokens + secondUsage.prompt_tokens,
            completion_tokens: firstUsage.completion_tokens + secondUsage.completion_tokens,
            total_tokens: firstUsage.total_tokens + secondUsage.total_tokens,
            model: selectedModel,
        };

        setOutputText(secondResult);
        setLastTokenUsage(finalTokenUsage);
        audioService.playSound('receive');

    } catch (e: any) {
        const errorMessage = e.message || 'An unknown error occurred.';
        setError(errorMessage);
        audioService.playSound('error');
    } finally {
        setIsLoading(false);
        setActiveShunt(null);
    }

  }, [inputText, isLoading, isValid, markAsTouched, validate, selectedModel]);
  
  const handlePasteDemo = () => {
    setInputText(DEMO_TEXT);
    reset();
    setError(null);
  };
  
  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError(null);
    setLastTokenUsage(null);
    reset();
    setModulesForLastRun(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 md:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-auto">
        <div className="xl:col-span-1">
          <InputPanel
            value={inputText}
            onChange={handleInputChange}
            onBlur={markAsTouched}
            onPasteDemo={handlePasteDemo}
            onFileLoad={(text) => setInputText(text)}
            onClearFile={handleClear}
            error={isTouched && Object.values(errors).length > 0 ? Object.values(errors)[0] : null}
            maxLength={MAX_INPUT_LENGTH}
            isLoading={isLoading}
          />
        </div>
        <div className="xl:col-span-1">
          <ControlPanel
            onShunt={(action) => handleShunt(action)}
            onModularShunt={handleModularShunt}
            onCombinedShunt={handleCombinedShunt}
            isLoading={isLoading}
            activeShunt={activeShunt}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
        <div className="xl:col-span-1">
          <OutputPanel
            text={outputText}
            isLoading={isLoading}
            error={error}
            activeShunt={activeShunt}
            modulesUsed={modulesForLastRun}
          />
        </div>
      </div>
      <TabFooter />
    </div>
  );
};

export default Shunt;
