// services/skillParser.ts

/**
 * Parses the markdown output from the "Build a Skill" AI to extract individual files.
 * The AI is prompted to return files in a specific format:
 * // path/to/file.ext
 * ```lang
 * file content...
 * ```
 * This function uses a regular expression to capture the path and the content of each block.
 *
 * @param markdown - The raw markdown string from the AI.
 * @returns An array of objects, each containing the `path` and `content` of a file.
 */
export const parseSkillPackagePlan = (markdown: string): { path: string; content: string }[] => {
  const files: { path: string; content: string }[] = [];
  
  // Regex to capture:
  // 1. A comment line with the file path, e.g., `// path/to/file.ext`
  // 2. The following code block's content.
  const fileBlockRegex = /\/\/\s*([\w\/-]+\.[\w\.-]+)\s*\n```[\w-]*\n([\s\S]*?)```/g;

  let match;
  while ((match = fileBlockRegex.exec(markdown)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    files.push({ path, content });
  }

  // Fallback for cases where the file path might be inside the code block,
  // which was the old, less reliable format.
  if (files.length === 0) {
    const fallbackRegex = /```[\w-]*\s*\/\/\s*([\w\/-]+\.[\w\.-]+)\n([\s\S]*?)```/g;
    while ((match = fallbackRegex.exec(markdown)) !== null) {
        const path = match[1].trim();
        const content = match[2].trim();
        files.push({ path, content });
    }
  }
  
  // A second fallback for a different common AI pattern.
  if (files.length === 0) {
    const fallbackRegex2 = /###\s*`?([\w\/-]+\.[\w\.-]+)`?\s*\n```[\w-]*\n([\s\S]*?)```/g;
    while ((match = fallbackRegex2.exec(markdown)) !== null) {
        const path = match[1].trim();
        const content = match[2].trim();
        files.push({ path, content });
    }
  }

  return files;
};