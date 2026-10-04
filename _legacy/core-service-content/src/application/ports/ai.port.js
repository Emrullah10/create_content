/**
 * @typedef {Object} AiPort
 * @property {(theme: object, existingTitles: string[]) => Promise<Array<{title:string, angle:string, keywords:string[]}>>} generateTopics
 * @property {(topic: object) => Promise<object>} generateOutline
 * @property {(topic: object, outline: object) => Promise<{title, subtitle, summary, tags, bodyMarkdown, diagrams, coverPrompt}>} draftArticle
 * @property {(draft: object) => Promise<{revised: object, notes: string}>} critiqueAndRevise
 * @property {(article: object, currentWordCount: number) => Promise<{bodyMarkdown: string, summary: string}>} expandArticle
 * @property {(article: object) => Promise<{score: number, report: object}>} scoreArticle
 * @property {(mermaidSource: string, error: string, diagramType: string) => Promise<{mermaid: string}>} repairDiagram
 * @property {(article: object, qualityReport: object, threshold: number) => Promise<{bodyMarkdown: string, summary: string, changes: string[]}>} targetedRevise
 * @property {(prompt: string) => Promise<Buffer>} generateCoverImage
 */
export const AI_PORT_METHODS = ['generateTopics', 'generateOutline', 'draftArticle', 'critiqueAndRevise', 'expandArticle', 'scoreArticle', 'repairDiagram', 'targetedRevise', 'generateCoverImage'];
