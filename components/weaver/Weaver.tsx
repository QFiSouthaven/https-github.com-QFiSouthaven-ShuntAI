
import React, { useState, useCallback, useEffect } from 'react';
import { generateDevelopmentPlan } from '../../services/geminiService';
import { useTelemetry } from '../../context/TelemetryContext';
import { GeminiResponse, Documentation } from '../../types';
import { INITIAL_DOCUMENTATION } from '../../context/constants';
import PlanDisplay from './PlanDisplay';
import MemoryPanel from './MemoryPanel';
import VersionHistoryPanel from '../common/VersionHistoryPanel';
import MailboxModal from './MailboxModal';
import { useMailbox } from '../../context/MailboxContext';
import { CheckIcon, MailboxIcon } from '../icons';
import { logFrontendError, ErrorSeverity } from '../../utils/errorLogger';
import { audioService } from '../../services/audioService';

const Spinner: React.FC = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const WEAVER_PLAN_CONTENT_REF = 'weaver_plan_output';

const Weaver: React.FC = () => {
  const { telemetryService, versionControlService, updateTelemetryContext } = useTelemetry();
  const { unreadCount } = useMailbox();

  const [goal, setGoal] = useState<string>('');
  const [geminiResponse, setGeminiResponse] = useState<GeminiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planJustGenerated, setPlanJustGenerated] = useState<boolean>(false);
  const [documentation, setDocumentation] = useState<Documentation>(INITIAL_DOCUMENTATION);
  const [currentPlanOutput, setCurrentPlanOutput] = useState<string>('');
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);

  const suggestions = [
    "Implement a confirmation modal before deleting an item in the Orchestrator tab.",
    "Add a 'Copy to Markdown' button in the Shunt output panel for easy pasting into documents.",
    "Create a new 'Translate to German' action in the Shunt control panel.",
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setGoal(suggestion);
  };

  useEffect(() => {
    updateTelemetryContext({ tab: 'Weaver' });
  }, [updateTelemetryContext]);
  
  useEffect(() => {
    if (versionControlService) {
        const versions = versionControlService.getVersions(WEAVER_PLAN_CONTENT_REF);
        if (versions.length > 0) {
            const latestContent = versionControlService.getVersionContent(versions[0].versionId);
            if (latestContent) {
                try {
                    const parsedResponse: GeminiResponse = JSON.parse(latestContent);
                    setGeminiResponse(parsedResponse);
                    setCurrentPlanOutput(latestContent);
                } catch (e) {
                    console.error('Failed to parse latest plan from version history:', e);
                    setCurrentPlanOutput(latestContent);
                }
            }
        }
    }
  }, [versionControlService]);

  const handleDocumentationChange = useCallback((field: keyof Documentation, value: string) => {
    setDocumentation(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleGoalSubmit = useCallback(async () => {
    if (!goal || !telemetryService || !versionControlService) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setGeminiResponse(null);
    
    const startTime = Date.now();
    const modelUsed = 'gemini-2.5-flash';
    
    telemetryService.recordEvent({
        eventType: 'user_input',
        interactionType: 'plan_generation_request',
        tab: 'Weaver',
        userInput: { goal },
        contextDetails: { geminiContextLength: documentation.geminiContext.length },
        modelUsed,
    });

    try {
      const response = await generateDevelopmentPlan(goal, documentation.geminiContext);
      const planString = JSON.stringify(response, null, 2);

      setGeminiResponse(response);
      setCurrentPlanOutput(planString);
      setSuccessMessage('Development plan generated successfully!');
      setPlanJustGenerated(true);
      setTimeout(() => setPlanJustGenerated(false), 1500);
      setTimeout(() => setSuccessMessage(null), 5000);
      
      const latency = Date.now() - startTime;

      telemetryService.recordEvent({
          eventType: 'ai_response',
          interactionType: 'plan_generation_response',
          tab: 'Weaver',
          userInput: { goal },
          aiOutput: response,
          outcome: 'success',
          latency,
          modelUsed,
          promptVersion: 'v1.2-dev-plan',
          tokenUsage: response.tokenUsage,
      });
      
      await versionControlService.captureVersion(
          'development_plan',
          WEAVER_PLAN_CONTENT_REF,
          planString,
          'ai_response',
          `Generated plan for goal: "${goal.substring(0, 50)}..."`,
          { goal, modelUsed }
      );
      audioService.playSound('success');

    } catch (e) {
      logFrontendError(e, ErrorSeverity.Critical, {
        context: 'Weaver.handleGoalSubmit',
        goal,
      });
      const latency = Date.now() - startTime;
      let errorMessage = 'An unexpected error occurred while formulating the plan.';
      if (e instanceof Error) {
        errorMessage = `${e.message} This could be due to network issues or a problem with the AI service. Please try again.`;
      }
      setError(errorMessage);

      telemetryService.recordEvent({
          eventType: 'ai_response',
          interactionType: 'plan_generation_response',
          tab: 'Weaver',
          userInput: { goal },
          aiOutput: { error: errorMessage },
          outcome: 'error',
          latency,
          modelUsed,
      });
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
    }
  }, [goal, documentation.geminiContext, telemetryService, versionControlService]);
  
  const handleRevertPlan = useCallback((revertedContent: string) => {
    try {
        const parsedResponse: GeminiResponse = JSON.parse(revertedContent);
        setGeminiResponse(parsedResponse);
        setCurrentPlanOutput(revertedContent);
    } catch (e) {
        console.error('Failed to parse reverted plan:', e);
        alert('Reverted content is not a valid plan format. Displaying raw content.');
        setCurrentPlanOutput(revertedContent);
        setGeminiResponse(null);
    }
  }, []);

  const isSubmitDisabled = isLoading || !goal;

  return (
    <>
    <MailboxModal isOpen={isMailboxOpen} onClose={() => setIsMailboxOpen(false)} />
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 p-4 md:p-6 h-full overflow-hidden">
      {/* Column 1: Goal Input & Memory */}
      <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 xl:col-span-1">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
                <h2 className="text-xl font-semibold text-white">1. Define Goal</h2>
                <p className="text-gray-400 mt-2 mb-4">Describe the feature or change you want for the "AI Content Shunt" project in plain English.</p>
            </div>
            <button
                onClick={() => setIsMailboxOpen(true)}
                className="relative flex-shrink-0 flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-200 bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-700/80 hover:border-gray-500"
                title="Open Mailbox"
            >
                <MailboxIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-gray-800">
                        {unreadCount}
                    </span>
                )}
            </button>
          </div>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full h-32 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            placeholder="e.g., 'add a feature to export conversations as a JSON file'"
          />
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 mb-2">Need inspiration? Try one of these:</p>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors w-full p-0 bg-transparent border-none"
                  >
                    "{suggestion}"
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={handleGoalSubmit}
            disabled={isSubmitDisabled}
            className="mt-6 w-full px-6 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? <Spinner /> : 'Formulate Development Plan'}
          </button>
          {error && <p className="text-red-400 mt-4">{error}</p>}
          {successMessage && (
            <div className="mt-4 flex items-center gap-2 text-green-300 bg-green-900/50 border border-green-700/80 p-3 rounded-md">
                <CheckIcon className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{successMessage}</p>
            </div>
           )}
        </div>
        <div className="flex-grow min-h-[400px]">
          <MemoryPanel
            documentation={documentation}
            onDocumentationChange={handleDocumentationChange}
          />
        </div>
      </div>

      {/* Column 2 & 3: Plan Display */}
      <div className="h-full overflow-hidden flex flex-col xl:col-span-2">
          {isLoading ? (
               <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
                    <div className="text-center">
                        <Spinner />
                        <p className="mt-4 text-gray-400">Generating plan...</p>
                    </div>
                </div>
          ) : (
             <PlanDisplay plan={geminiResponse} newlyGenerated={planJustGenerated} />
          )}
      </div>
      
      {/* Column 4: Version History */}
      <div className="h-full overflow-hidden flex flex-col xl:col-span-1">
          <VersionHistoryPanel
              contentRef={WEAVER_PLAN_CONTENT_REF}
              contentType="development_plan"
              onVersionSelect={handleRevertPlan}
              currentContent={currentPlanOutput}
          />
      </div>
    </div>
    </>
  );
};

export default Weaver;
