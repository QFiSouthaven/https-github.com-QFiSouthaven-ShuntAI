import { Documentation } from '../types';

export const INITIAL_DOCUMENTATION: Documentation = {
  geminiContext: `
# GEMINI_CONTEXT.md
## Project: AI Content Shunt

This document provides Gemini with a high-level overview of the "AI Content Shunt" project's architecture, components, and conventions.

### Core Architecture
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useCallback)
- **Key Libraries**: reactflow for the orchestrator UI.

### Key Components
- \`components/mission_control/MissionControl.tsx\`: The main tabbed interface.
- \`components/orchestrator/Orchestrator.tsx\`: The node-based workflow editor.
- \`components/shunt/Shunt.tsx\`: The text-transformation utility.
- \`services/geminiService.ts\`: Contains all fetch logic for the Gemini API.

### Coding Conventions
- Components are functional with React Hooks.
- TypeScript is used for type safety.
- All styles are applied using Tailwind CSS utility classes.
- File paths are explicitly referenced in tasks.
`,
  progressLog: `
# Progress Log
- **2024-10-16**: Initial project setup and merger of the Shunt and Orchestrator applications.
- **2024-10-17**: Implemented the "Make Actionable" feature with an advanced AI prompt.
`,
  decisions: `
# Architectural Decisions
- **State Management**: Chose React's built-in hooks for simplicity.
- **UI**: Opted for a tab-based interface within a single \`MissionControl\` component.
`,
  issuesAndFixes: `
# Issues and Fixes
- **Issue**: The initial orchestrator was a non-functional placeholder.
- **Fix**: Replaced the placeholder with the fully interactive \`reactflow\`-based component.
`,
  featureTimeline: `
# Feature Timeline
- **Q4 2024**: Core Shunt and Orchestrator functionality.
- **Q1 2025**: Integration of the Aetherium Weaver agentic development module.
`,
};