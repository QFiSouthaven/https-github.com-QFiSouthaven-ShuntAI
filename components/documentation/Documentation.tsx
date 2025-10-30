// components/documentation/Documentation.tsx
import React from 'react';
import TabFooter from '../common/TabFooter';
import MarkdownRenderer from '../common/MarkdownRenderer';

const DOCS_CONTENT = `
# Aether Shunt Documentation

Welcome to the Aether Shunt, a powerful suite of tools for AI-driven content manipulation, analysis, and development.

## Core Modules

### Shunt
The Shunt is your primary tool for transforming text. It offers a variety of actions, from simple summarization to complex code generation.
- **Usage**: Paste your content into the input panel, select a model, and click an action button.
- **Chaining Actions**: You can drag one action button onto another to create a two-step workflow. For example, drag "Summarize" onto "Translate to Spanish" to first summarize and then translate the result.

### Weaver
The Weaver is an agentic development assistant. It helps you break down high-level goals into concrete, actionable development plans.
- **Project Memory**: The left panel contains documents that provide context to the AI. Keep the \`GEMINI_CONTEXT.md\` file up-to-date with your project's architecture.
- **Generating a Plan**: Write a clear goal in the input box and click "Generate Plan". The AI will use the Project Memory to create a detailed plan, which will appear in the right panel.

### Orchestrator
This module provides a visual representation of complex systems or workflows. You can view dependencies, check statuses, and interact with nodes.
- **Navigation**: Use the mouse to pan and zoom. The minimap provides an overview.
- **Node Details**: Click on any node to open a details panel with more information.

### TRIM Agent
The Autonomous Optimization agent monitors application performance metrics in real-time.
- **1-Click Optimization**: This feature uses an AI to analyze current metrics and apply automated performance enhancements, such as cache tuning.
- **AI Performance Report**: Generate a natural-language report that explains the current performance state and suggests improvements.

### Image Analysis
This tool uses a multi-modal AI to analyze images.
- **Usage**: Upload an image file and provide a text prompt describing what you want the AI to do.
- **Capabilities**: It can describe images, answer questions about them, and even generate technical specifications for 3D artists based on a character's appearance.
`;

const Documentation: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 md:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <MarkdownRenderer content={DOCS_CONTENT} />
        </div>
      </div>
      <TabFooter />
    </div>
  );
};

export default Documentation;
