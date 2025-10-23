// services/skillParser.ts

/**
 * Parses the markdown output from the "Build a Skill" AI to extract individual files.
 * The AI is prompted to return files in a specific format:
 * ```lang // path/to/file.ext
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
  // 1. The language identifier (optional, non-greedy)
  // 2. The file path in a comment `// path/to/file.ext`
  // 3. The content of the code block until the closing ```
  const fileBlockRegex = /```[\w-]*\s*\/\/\s*([\w\/-]+\.[\w]+)\n([\s\S]*?)```/g;

  let match;
  while ((match = fileBlockRegex.exec(markdown)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    files.push({ path, content });
  }

  // Fallback for cases where the file path might be outside the code block,
  // e.g., `### path/to/file.md` followed by a block.
  // This is less common with the current prompt but adds robustness.
  if (files.length === 0) {
    const fallbackRegex = /###\s*`?([\w\/-]+\.[\w]+)`?\s*\n```[\w-]*\n([\s\S]*?)```/g;
    while ((match = fallbackRegex.exec(markdown)) !== null) {
        const path = match[1].trim();
        const content = match[2].trim();
        files.push({ path, content });
    }
  }

  return files;
};