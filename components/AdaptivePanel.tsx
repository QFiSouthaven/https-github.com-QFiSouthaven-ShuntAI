// components/AdaptivePanel.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAutonomous } from '../context/AutonomousContext';
import { AutonomousDirective, generateUniqueId } from '../types/autonomous';
// FIX: Corrected import to use the newly exported 'trackCustomEvent'.
import { trackCustomEvent } from '../services/telemetry';

interface AdaptivePanelProps {
  id: string;
  title: string;
  children?: React.ReactNode;
  defaultContent?: React.ReactNode;
  defaultStyle?: React.CSSProperties;
}

const AdaptivePanel: React.FC<AdaptivePanelProps> = ({
  id,
  title,
  children,
  defaultContent,
  defaultStyle,
}) => {
  const { activeDirectives, consumeDirective, dispatchTelemetryEvent } = useAutonomous();
  const [currentContent, setCurrentContent] = useState<React.ReactNode>(defaultContent || children);
  const [currentStyle, setCurrentStyle] = useState<React.CSSProperties>(defaultStyle || {});
  const [proactiveSuggestion, setProactiveSuggestion] = useState<AutonomousDirective | null>(null);

  useEffect(() => {
    const uiConfigDirectives = activeDirectives.filter(
      (d) => d.type === 'UI_RECONFIGURATION' && d.targetElementId === id
    );

    if (uiConfigDirectives.length > 0) {
      const latestDirective = uiConfigDirectives[0];
      if (latestDirective.payload.newContent) setCurrentContent(latestDirective.payload.newContent);
      if (latestDirective.payload.newStyle) setCurrentStyle((prev) => ({ ...prev, ...latestDirective.payload.newStyle }));
      consumeDirective(latestDirective.id);
      // FIX: Corrected the event type to be more specific.
      trackCustomEvent('ui_reconfiguration_applied', { context: { directiveId: latestDirective.id } });
    }
  }, [activeDirectives, id, consumeDirective]);

  useEffect(() => {
    const suggestionDirectives = activeDirectives.filter(
      (d) => d.type === 'SUGGESTION' && d.targetElementId === id
    );

    if (suggestionDirectives.length > 0 && !proactiveSuggestion) {
      const latestDirective = suggestionDirectives[0];
      setProactiveSuggestion(latestDirective);
      // FIX: Corrected the event type to be more specific.
      trackCustomEvent('suggestion_displayed', { context: { directiveId: latestDirective.id } });
    } else if (suggestionDirectives.length === 0 && proactiveSuggestion) {
      setProactiveSuggestion(null);
    }
  }, [activeDirectives, id, proactiveSuggestion]);

  const handleSuggestionAction = (directive: AutonomousDirective, actionType: string) => {
    dispatchTelemetryEvent({
      eventType: 'suggestionAction',
      elementId: id,
      context: {
        directiveId: directive.id,
        actionType: actionType,
        userFeedback: actionType === 'DISMISS' ? 'negative' : 'positive',
      },
    });
    setProactiveSuggestion(null);
    consumeDirective(directive.id);
  };

  return (
    <div id={id} style={{ border: '1px solid #ccc', padding: '15px', margin: '10px', ...currentStyle }}>
      <h3>{title} <small>(Adaptive Panel)</small></h3>
      <div>{currentContent}</div>

      {proactiveSuggestion && (
        <div style={{ background: '#e6f7ff', borderLeft: '3px solid #1890ff', padding: '10px', marginTop: '10px' }}>
          <p><strong>Proactive Suggestion:</strong> {proactiveSuggestion.payload.message}</p>
          <button onClick={() => handleSuggestionAction(proactiveSuggestion, proactiveSuggestion.payload.actionType || 'ACCEPTED')}>
            {proactiveSuggestion.payload.actionText || 'Take Action'}
          </button>
          <button onClick={() => handleSuggestionAction(proactiveSuggestion, 'DISMISS')} style={{ marginLeft: '10px' }}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default AdaptivePanel;
