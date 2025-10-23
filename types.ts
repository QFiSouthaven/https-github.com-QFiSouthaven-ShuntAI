// types.ts
import React from 'react';

export enum ShuntAction {
  SUMMARIZE = 'Summarize',
  AMPLIFY = 'Amplify',
  EXPLAIN_LIKE_IM_FIVE = "Explain Like I'm 5",
  EXPLAIN_LIKE_A_SENIOR = 'Explain to an Expert',
  EXTRACT_KEYWORDS = 'Extract Keywords',
  EXTRACT_ENTITIES = 'Extract Entities',
  ENHANCE_WITH_KEYWORDS = 'Enhance with Keywords',
  CHANGE_TONE_FORMAL = 'Make Formal',
  CHANGE_TONE_CASUAL = 'Make Casual',
  PROOFREAD = 'Proofread & Fix',
  TRANSLATE_SPANISH = 'Translate to Spanish',
  FORMAT_JSON = 'Format as JSON',
  PARSE_JSON = 'Parse JSON to Text',
  MAKE_ACTIONABLE = 'Make Actionable',
  INTERPRET_SVG = 'Interpret SVG',
  BUILD_A_SKILL = 'Build a Skill',
  GENERATE_VAM_PRESET = 'Generate VAM Preset',
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
}

export interface ImplementationTask {
  filePath: string;
  description: string;
  details?: string;
  newContent?: string;
}

export interface GeminiResponse {
  clarifyingQuestions: string[];
  architecturalProposal: string;
  implementationTasks: ImplementationTask[];
  testCases: string[];
  tokenUsage?: TokenUsage;
}

export enum MissionControlTabKey {
  Shunt = 'shunt',
  Orchestrator = 'orchestrator',
  TrimAgent = 'trim_agent',
  Weaver = 'weaver',
  Chat = 'chat',
  ContextualChat = 'contextual_chat',
  ImageAnalysis = 'image_analysis',
  AnthropicChat = 'anthropic_chat',
  Chronicle = 'chronicle',
  Developers = 'developers',
  Settings = 'settings',
}

export interface MissionControlTab {
  key: MissionControlTabKey;
  label: string;
  icon: React.ReactNode;
  ContentComponent: React.FC;
}

export interface Documentation {
  geminiContext: string;
  progressLog: string;
  decisions: string;
  issuesAndFixes: string;
  featureTimeline: string;
}

export interface MailboxFile {
    id: string;
    path: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    versionId: string;
}