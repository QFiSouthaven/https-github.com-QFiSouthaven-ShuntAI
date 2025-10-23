// features/mia/miaTypes.ts

import { GeminiResponse } from '../../types';

// --- Mia Types ---

export interface MiaMessage {
  id: string;
  sender: 'user' | 'mia' | 'system-error' | 'system-progress';
  text: string;
  timestamp: string;
  isHtml?: boolean; // For richer content
  action?: {
    type: 'suggest_refresh' | 'clear_cache' | 'link_to_docs' | 'run_automated_fix';
    payload?: any;
    label?: string;
  };
  diagnosableError?: MiaAlert;
  fixProposal?: GeminiResponse;
}

export interface MiaAlert {
  id: string;
  type: 'system_health' | 'predictive_bug' | 'onboarding_tip' | 'error_diagnosis' | string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  context?: Record<string, any>; // The full error log or telemetry event
  actions?: { label: string; actionType: string; payload?: any }[];
}
