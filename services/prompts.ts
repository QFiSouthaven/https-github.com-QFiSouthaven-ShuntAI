// services/prompts.ts

// FIX: Corrected import path to be relative to the project root.
import { ShuntAction } from '../types';

export const getPromptForAction = (text: string, action: ShuntAction): string => {
  switch (action) {
    case ShuntAction.SUMMARIZE:
      return `Summarize the following text into a concise paragraph, capturing the main points:\n\n---\n\n${text}`;
    case ShuntAction.AMPLIFY:
      return `Amplify and expand upon the following text. Add more detail, examples, and elaborate on the main points to make it more comprehensive withoutadding fluff:\n\n---\n\n${text}`;
    case ShuntAction.TRANSLATE_SPANISH:
      return `Translate the following text to Spanish:\n\n---\n\n${text}`;
    case ShuntAction.CHANGE_TONE_FORMAL:
      return `Rewrite the following text in a formal and professional tone:\n\n---\n\n${text}`;
    case ShuntAction.CHANGE_TONE_CASUAL:
      return `Rewrite the following text in a friendly, casual, and conversational tone:\n\n---\n\n${text}`;
    case ShuntAction.EXPLAIN_LIKE_IM_FIVE:
      return `Explain the following text as if you were talking to a 5-year-old child. Use simple words and analogies:\n\n---\n\n${text}`;
    case ShuntAction.EXPLAIN_LIKE_A_SENIOR:
      return `Explain the following text as if you were talking to a senior expert in the field. Use sophisticated language, technical terms, and assume a high level of understanding:\n\n---\n\n${text}`;
    case ShuntAction.EXTRACT_KEYWORDS:
      return `Extract the most important keywords from the following text. List them as a comma-separated list:\n\n---\n\n${text}`;
    case ShuntAction.EXTRACT_ENTITIES:
        return `Extract all named entities (such as people, organizations, locations, dates, and products) from the following text. List each entity on a new line.\n\n---\n\n${text}`;
    case ShuntAction.ENHANCE_WITH_KEYWORDS:
      return `Enhance the following text by integrating relevant keywords and using more descriptive, vivid language. Make the text more engaging and detailed:\n\n---\n\n${text}`;
    case ShuntAction.PROOFREAD:
      return `Proofread and correct any grammatical errors, spelling mistakes, or typos in the following text. Only provide the corrected version:\n\n---\n\n${text}`;
    case ShuntAction.FORMAT_JSON:
      return `Convert the key information from the following text into a structured JSON object. The JSON should be well-formed and represent the data logically:\n\n---\n\n${text}`;
    case ShuntAction.PARSE_JSON:
      return `Convert the following JSON object into a human-readable summary. Explain what the data represents in plain English:\n\n---\n\n${text}`;
    case ShuntAction.MAKE_ACTIONABLE:
      return `Act as an expert senior frontend engineer. Your task is to generate a complete and functional implementation plan based on the user's request. The generated plan should be production-quality, well-structured, and include all necessary code modifications.

Follow these rules strictly:
1.  **Analyze the Request:** Begin by briefly analyzing the user's request to understand the goal.
2.  **Formulate a Plan:** Create a step-by-step implementation plan.
3.  **Provide Code Modifications:** For each step in the plan, provide the complete, modified code for each file. Use markdown code blocks with the correct language identifier (e.g., \`\`\`typescript).
4.  **Create New Files:** If a new file needs to be created, provide the full path and the complete content of the new file.
5.  **Context is Key:** If you need more information about the existing codebase to complete the request, ask clarifying questions.

**User Request:**
---
${text}`;
    case ShuntAction.INTERPRET_SVG:
      return `The following is SVG code. Analyze it and describe what it visually represents in plain English. Detail its structure, including the main shapes, paths, styles, and colors used.
      
---

${text}`;
    case ShuntAction.BUILD_A_SKILL:
        return `You are an expert "Skill Authoring Agent" for Claude. Your task is to take a user's high-level request for a new skill and generate a complete, well-structured, and production-ready skill package plan. You must follow the best practices for skill creation.

**Your Guiding Principles (from skill creation documentation):**
1.  **Skill Anatomy:** A skill is a directory containing a required \`SKILL.md\` and optional \`scripts/\`, \`references/\`, and \`assets/\` directories.
2.  **Progressive Disclosure:** \`SKILL.md\` should be a lean entry point. Detailed information, schemas, or large documents go into the \`references/\` directory.
3.  **Clarity and Structure:** The output must be clear, actionable, and organized. Use imperative/infinitive form for instructions.
4.  **YAML Frontmatter:** The \`name\` must be hyphen-case (e.g., 'my-skill-name'). The \`description\` must be specific, written in the third person, and explain what the skill does and when to use it.
5.  **Reusable Resources:** Proactively identify opportunities for reusable scripts, reference documents, and assets based on the user's request.

**Your Task:**
Based on the user's request below, generate a comprehensive skill package plan.

**Output Format:**
Your output must be a single markdown document. Follow this structure precisely:

### 1. Skill Plan & Analysis
Briefly analyze the user's request and outline the proposed skill's purpose and structure. Explain your choices for the directory structure (e.g., why you've included certain scripts or reference files).

### 2. Proposed Directory Structure
List the file structure for the new skill in a clear, tree-like format.

### 3. File Contents
Provide the full, complete content for each file in the proposed structure. Each file's content must be enclosed in a markdown code block with the correct language identifier and a clear file path comment.

**User Request:**
---
${text}
---

**Example Output Structure:**

### 1. Skill Plan & Analysis
This skill will help with analyzing CSV data. I've planned a main \`SKILL.md\` file to guide the user, a Python script in \`scripts/\` to handle the core CSV parsing logic, and a reference document in \`references/\` with examples of common data formats.

### 2. Proposed Directory Structure
\`\`\`
csv-analyzer/
├── SKILL.md
├── scripts/
│   └── analyze_csv.py
└── references/
    └── format_examples.md
\`\`\`

### 3. File Contents

\`\`\`markdown
// csv-analyzer/SKILL.md
---
name: csv-analyzer
description: This skill provides tools and workflows for analyzing CSV files. Use when the user needs to parse, summarize, or extract data from .csv files.
version: 1.0.0
---
# CSV Analyzer Skill

## Overview
This skill helps analyze and process data from CSV files. It provides a reliable script for common analysis tasks.

## Core Workflow
To analyze a CSV file, follow these steps:
1.  Identify the path to the input CSV file.
2.  Run the \`analyze_csv.py\` script to get a summary.
    \`\`\`bash
    python scripts/analyze_csv.py path/to/your/file.csv
    \`\`\`
3.  For examples of supported CSV formats, see [references/format_examples.md](references/format_examples.md).
\`\`\`

\`\`\`python
// csv-analyzer/scripts/analyze_csv.py
import csv
import sys

def analyze_csv(file_path):
    """
    Reads a CSV file and prints a basic analysis.
    """
    try:
        with open(file_path, 'r', newline='') as csvfile:
            reader = csv.reader(csvfile)
            header = next(reader)
            row_count = sum(1 for row in reader)
            print(f"File: {file_path}")
            print(f"Columns ({len(header)}): {', '.join(header)}")
            print(f"Row count (excluding header): {row_count}")
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python analyze_csv.py <path-to-csv-file>")
        sys.exit(1)
    
    analyze_csv(sys.argv[1])
\`\`\`

\`\`\`markdown
// csv-analyzer/references/format_examples.md
# CSV Format Examples

## Standard Comma-Delimited
\`\`\`csv
header1,header2,header3
value1,value2,value3
\`\`\`

## Semicolon-Delimited
This skill's script currently only supports comma-delimited files.
\`\`\`
`;
    case ShuntAction.GENERATE_VAM_PRESET:
      return `Based on the following description of a 3D character, generate a complete JSON preset file in the Virt-a-Mate (VAM) format.

Your output must be a single, well-formed JSON object. Do not wrap it in markdown or add any explanatory text outside the JSON.

The JSON should define the character's appearance and properties. Emulate the structure of a typical VAM character preset, including the following key sections within the main "storables" array for the "geometry" id:
- "clothing": An array of objects, each with an "id", "internalId", and "enabled" status.
- "hair": An array of hair objects, similar to clothing.
- "morphs": A detailed array of morph objects, each with a "uid", "name", and "value" (from 0 to 1). This is critical for defining the character's face and body shape.
- "textures": An object containing URLs for diffuse, specular, gloss, and normal maps for face, torso, limbs, and genitals.
- Other relevant "storables" for skin materials, eye settings ('irises', 'sclera'), teeth, tongue, and physics ('BreastControl', 'GluteControl').

**Character Description:**
---
${text}
---
`;
    default:
      throw new Error('Unknown shunt action');
  }
};

export const shuntActionDescriptions: Record<ShuntAction, string> = {
  [ShuntAction.SUMMARIZE]: 'Condenses the input text into a concise summary of its main points.',
  [ShuntAction.AMPLIFY]: 'Expands on the input text, adding more detail and examples for comprehensiveness.',
  [ShuntAction.MAKE_ACTIONABLE]: 'Analyzes the input and generates a step-by-step implementation plan or actionable tasks.',
  [ShuntAction.BUILD_A_SKILL]: 'Generates a complete, structured skill package based on a high-level request.',
  [ShuntAction.EXPLAIN_LIKE_IM_FIVE]: 'Simplifies the input text, explaining it in simple terms suitable for a young child.',
  [ShuntAction.EXPLAIN_LIKE_A_SENIOR]: 'Rewrites the input text using sophisticated, expert-level language and technical terms.',
  [ShuntAction.EXTRACT_KEYWORDS]: 'Identifies and lists the most important keywords from the input text.',
  [ShuntAction.EXTRACT_ENTITIES]: 'Finds and lists all named entities (people, places, organizations, etc.) from the text.',
  [ShuntAction.ENHANCE_WITH_KEYWORDS]: 'Rewrites the input text to be more descriptive and engaging by integrating relevant keywords.',
  [ShuntAction.CHANGE_TONE_FORMAL]: 'Converts the input text to a formal and professional tone.',
  [ShuntAction.CHANGE_TONE_CASUAL]: 'Rewrites the input text to have a friendly, informal, and conversational tone.',
  [ShuntAction.PROOFREAD]: 'Corrects spelling, grammar, and typos in the input text.',
  [ShuntAction.TRANSLATE_SPANISH]: 'Translates the input text into Spanish.',
  [ShuntAction.FORMAT_JSON]: 'Converts the key information from the input text into a structured JSON object.',
  [ShuntAction.PARSE_JSON]: 'Transforms a JSON object into a human-readable, plain English summary.',
  [ShuntAction.INTERPRET_SVG]: 'Analyzes SVG code and describes the visual image it represents.',
  [ShuntAction.GENERATE_VAM_PRESET]: 'Creates a Virt-a-Mate (VAM) JSON preset file based on a character description.',
};