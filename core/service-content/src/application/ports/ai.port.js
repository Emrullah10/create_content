/**
 * @typedef {Object} AiPort
 * @property {(theme: object, existingTitles: string[]) => Promise<Array<{title:string, angle:string, keywords:string[]}>>} generateTopics
 * @property {(topic: object) => Promise<object>} generateOutline
 * @property {(topic: object, outline: object) => Promise<{title, subtitle, summary, tags, bodyMarkdown, diagrams, coverPrompt}>} draftArticle
 * @property {(draft: object) => Promise<{revised: object, notes: string}>} critiqueAndRevise
 * @property {(article: object) => Promise<{score: number, report: object}>} scoreArticle
 * @property {(prompt: string) => Promise<Buffer>} generateCoverImage
 */
export const AI_PORT_METHODS = ['generateTopics', 'generateOutline', 'draftArticle', 'critiqueAndRevise', 'scoreArticle', 'generateCoverImage'];
