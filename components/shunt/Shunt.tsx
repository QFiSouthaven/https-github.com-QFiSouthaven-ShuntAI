// components/shunt/Shunt.tsx
import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
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
import { useMCPContext } from '../../context/MCPContext';
import { MCPConnectionStatus } from '../../types/mcp';
import { logFrontendError, ErrorSeverity } from '../../utils/errorLogger';

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
  const [showAmplifyX2, setShowAmplifyX2] = useState(false);


  const { telemetryService, versionControlService } = useTelemetry();
  const { deliverFiles } = useMailbox();
  const { extensionApi, status: mcpStatus } = useMCPContext();

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
    setShowAmplifyX2(false);
    setActiveShunt(action);
    audioService.playSound('send');
    
    try {
      const { resultText, tokenUsage } = await performShunt(textToProcess, action as ShuntAction, selectedModel);
      
      if (action === ShuntAction.BUILD_A_SKILL) {
        const files = parseSkillPackagePlan(resultText);
        if (files.length > 0) {
            await deliverFiles(files);
            const skillName = files[0].path.split('/')[0] || 'skill-package';
            
            if (mcpStatus === MCPConnectionStatus.Connected && extensionApi?.fs) {
                setOutputText(`MCP extension connected. Shunting skill '${skillName}' directly to your computer...`);
                await Promise.all(
                    files.map(file => extensionApi.fs!.saveFile(file.path, file.content))
                );
                setOutputText(`✅ Skill package '${skillName}' shunted directly to your computer!\n\n${files.length} file(s) are now on your local filesystem and also available in your Mailbox.`);

            } else {
                const zip = new JSZip();
                files.forEach(file => {
                    zip.file(file.path, file.content);
                });
                
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `${skillName}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                setOutputText(`✅ Skill package generated successfully!\n\n${files.length} file(s) have been delivered to your Mailbox and downloaded as \`${skillName}.zip\`.\n\n(Tip: Connect the MCP Browser Extension to shunt files directly to your computer).`);
            }
            
            audioService.playSound('success'); 
        } else {
            setOutputText(`⚠️ Could not parse any files from the AI's response.\n\nThe raw output is shown below for debugging:\n\n---\n\n${resultText}`);
            audioService.playSound('error');
        }
      } else {
        setOutputText(resultText);
        if (action === ShuntAction.AMPLIFY && resultText) {
            setShowAmplifyX2(true);
        }
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
      logFrontendError(e, ErrorSeverity.High, {
          context: 'Shunt.handleShunt',
          action,
          selectedModel,
      });
      const userFriendlyMessage = 'An unexpected error occurred. Check the developer console for details.';
      setError(userFriendlyMessage);
      setShowAmplifyX2(false);
      audioService.playSound('error');
       telemetryService?.recordEvent({
        eventType: 'ai_response',
        interactionType: 'shunt_action',
        tab: 'Shunt',
        outcome: 'error',
        customData: { action, error: e.message || 'An unknown error occurred.' }
      });
    } finally {
      setIsLoading(false);
      setActiveShunt(null);
    }
  }, [inputText, isLoading, isValid, markAsTouched, validate, errors, telemetryService, selectedModel, versionControlService, deliverFiles, mcpStatus, extensionApi]);
  
    const handleAmplifyX2 = useCallback(async () => {
        if (!outputText || isLoading) return;
        setInputText(outputText); // Put output back into input for user to see
        handleShunt(ShuntAction.AMPLIFY_X2, outputText);
    }, [outputText, isLoading, handleShunt]);

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
    setShowAmplifyX2(false);
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
        logFrontendError(e, ErrorSeverity.High, {
            context: 'Shunt.handleModularShunt',
            modules: Array.from(modules),
        });
        const userFriendlyMessage = 'An unexpected error occurred. Check the developer console for details.';
        setError(userFriendlyMessage);
        audioService.playSound('error');
        telemetryService?.recordEvent({
            eventType: 'ai_response',
            interactionType: 'modular_shunt_action',
            tab: 'Shunt',
            outcome: 'error',
            customData: { modules: Array.from(modules), error: e.message || 'An unknown error occurred.' }
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
    setShowAmplifyX2(false);
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
        
        telemetryService?.recordEvent({
            eventType: 'ai_response',
            interactionType: 'combined_shunt_action',
            tab: 'Shunt',
            outcome: 'success',
            tokenUsage: finalTokenUsage,
            customData: { actions: [draggedAction, targetAction] }
        });

    } catch (e: any) {
        logFrontendError(e, ErrorSeverity.High, {
            context: 'Shunt.handleCombinedShunt',
            actions: [draggedAction, targetAction],
            selectedModel,
        });
        const userFriendlyMessage = 'An unexpected error occurred. Check the developer console for details.';
        setError(userFriendlyMessage);
        audioService.playSound('error');
        
        telemetryService?.recordEvent({
            eventType: 'ai_response',
            interactionType: 'combined_shunt_action',
            tab: 'Shunt',
            outcome: 'error',
            customData: { actions: [draggedAction, targetAction], error: e.message || 'An unknown error occurred.' }
        });
    } finally {
        setIsLoading(false);
        setActiveShunt(null);
    }

  }, [inputText, isLoading, isValid, markAsTouched, validate, selectedModel, telemetryService]);
  
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
    setShowAmplifyX2(false);
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
            showAmplifyX2={showAmplifyX2}
            onAmplifyX2={handleAmplifyX2}
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