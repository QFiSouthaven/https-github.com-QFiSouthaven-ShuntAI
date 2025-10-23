// utils/errorLogger.ts
import { v4 as uuidv4 } from 'uuid';
import { MiaAlert } from '../features/mia/miaTypes';
import { appEventBus } from '../lib/eventBus';

export enum ErrorSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export const logFrontendError = (
  error: any, // Changed to 'any' to robustly handle all rejection reasons
  severity: ErrorSeverity = ErrorSeverity.Medium,
  context?: Record<string, any>
) => {
  let message: string;
  let stack: string | undefined;
  let title: string = "An error occurred";

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
    title = error.name;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Event && error.type === 'error') {
    const errorEvent = error as ErrorEvent;
    message = errorEvent.message || 'Unknown DOM Error';
    stack = errorEvent.error?.stack || undefined;
    title = 'DOM Error';
  } else if (error && typeof error === 'object') {
    try {
      message = `Unhandled rejection with non-Error object: ${JSON.stringify(error, null, 2)}`;
      title = 'Unhandled Promise Rejection';
    } catch (e) {
      message = 'An unknown error occurred with a non-serializable object.';
      title = 'Unknown Error';
    }
  } else {
    message = `An unknown error occurred. Value: ${String(error)}`;
    title = 'Unknown Error';
  }


  const errorLog = {
    timestamp: new Date().toISOString(),
    message,
    stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    severity,
    context: {
      ...context,
      route: window.location.pathname,
    },
  };

  console.error('Frontend Error Log:', errorLog);
  
  // Create a MiaAlert and emit it on the event bus
  const newAlert: MiaAlert = {
    id: uuidv4(),
    type: 'error_diagnosis',
    severity: severity === ErrorSeverity.Low ? 'info' : severity === ErrorSeverity.Medium ? 'warning' : 'critical',
    title: title,
    message: message,
    timestamp: errorLog.timestamp,
    context: errorLog, // Attach the full log as context
  };
  appEventBus.emit('mia-alert', newAlert);
  
  appEventBus.emit('telemetry', { type: 'error', data: errorLog });
};

export const setupGlobalErrorHandlers = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    logFrontendError(error || message.toString(), ErrorSeverity.High, { source, lineno, colno });
    return false;
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    logFrontendError(event.reason, ErrorSeverity.High, { type: 'unhandled-promise-rejection' });
  };
};
