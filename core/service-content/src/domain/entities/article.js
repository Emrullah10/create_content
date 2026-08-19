export const REQUIRED_MIN_DIAGRAMS = 2;
export const REQUIRED_MIN_CODE_BLOCKS = 3;

export const makeArticle = ({ id, topicId, title, subtitle = null, slug, bodyMarkdown = '', summary = null, tags = [], status = 'drafting' }) => {
  if (!topicId) throw new Error('Article requires topicId');
  if (!title || !title.trim()) throw new Error('Article requires a non-empty title');
  if (!slug) throw new Error('Article requires a slug');

  return { id, topicId, title: title.trim(), subtitle, slug, bodyMarkdown, summary, tags, status };
};

export const countCodeBlocks = (markdown) => (markdown.match(/```/g) || []).length / 2;

export const wordCount = (markdown) => markdown.trim().split(/\s+/).filter(Boolean).length;

export const extractPlaceholders = (markdown) => [...markdown.matchAll(/\{\{DIAGRAM_\d+\}\}/g)].map((m) => m[0]);
