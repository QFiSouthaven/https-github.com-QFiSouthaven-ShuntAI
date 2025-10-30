import React, { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TelemetryProvider } from './context/TelemetryContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { MCPProvider } from './context/MCPContext';
import { MailboxProvider } from './context/MailboxContext';
import { MiaProvider } from './context/MiaContext'; // Import MiaProvider
import MissionControl from './components/mission_control/MissionControl';
import { GlobalTelemetryContext } from './types/telemetry';
import MiaAssistant from './components/mia/MiaAssistant';
import { useMiaContextTracker } from './hooks/useMiaContextTracker';
import ErrorBoundary from './components/ErrorBoundary';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  // Initialize user and session IDs, persisting them for the session/user
  const initialUserID = localStorage.getItem('userID') || `user_${uuidv4()}`;
  const initialSessionID = sessionStorage.getItem('sessionID') || `session_${uuidv4()}`;

  if (!localStorage.getItem('userID')) {
    localStorage.setItem('userID', initialUserID);
  }
  if (!sessionStorage.getItem('sessionID')) {
    sessionStorage.setItem('sessionID', initialSessionID);
  }

  const initialGlobalContext: GlobalTelemetryContext = {
    userID: initialUserID,
    sessionID: initialSessionID,
    appVersion: '2.0.0-professional', // Updated version
    browserInfo: navigator.userAgent,
  };

  return (
    <SettingsProvider>
      <TelemetryProvider initialGlobalContext={initialGlobalContext}>
        <MCPProvider>
          <MailboxProvider>
            <MiaProvider>
              <AppContent />
            </MiaProvider>
          </MailboxProvider>
        </MCPProvider>
      </TelemetryProvider>
    </SettingsProvider>
  );
};

// This sub-component ensures context hooks are used within the provider scope
const AppContent: React.FC = () => {
    const { settings } = useSettings();
    useMiaContextTracker(); // Activate Mia's context tracking globally

    useEffect(() => {
        // --- Global Style & Theme Management ---

        // Mia's font color
        document.documentElement.style.setProperty('--mia-font-color', settings.miaFontColor);
        
        // Dynamic background color
        document.body.style.backgroundColor = settings.backgroundColor;

        // Dynamic wallpaper
        document.body.style.backgroundImage = settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none';

        // Toggle animations globally via CSS class
        if (settings.animationsEnabled) {
            document.body.classList.add('animations-enabled');
        } else {
            document.body.classList.remove('animations-enabled');
        }

        // Mute/unmute audio service
        audioService.setMuted(!settings.audioFeedbackEnabled);

    }, [settings]);

    return (
        <div className="app-container w-full">
            <ErrorBoundary>
              <MissionControl />
            </ErrorBoundary>
            <ErrorBoundary>
              <MiaAssistant />
            </ErrorBoundary>
        </div>
    );
}

export default App;