import { DomainError } from '../../domain/errors/domain-error.js';

// Her LLM asamasi hangi ROLE gider (rol -> LLM_<ROL>_* env). Kisa/mekanik isler `utility` (yerel kucuk model olabilir),
// uzun yazim `writer`, degerlendirme `judge` (mumkunse yazardan farkli model).
export const LLM_ROLE = Object.freeze({
  topics: 'writer',
  'research-plan': 'utility',
  'research-facts': 'utility',
  outline: 'writer',
  section: 'writer',
  'revise-section': 'writer',
  editor: 'judge',
  judge: 'judge',
  improve: 'judge',
  'code-fix': 'utility',
  'diagram-repair': 'utility',
});

export const makeAsk = ({ llm, system }) => ({ stage, articleId = null, prompt, schema, schemaName, meta, temperature, maxTokens }) =>
  llm.complete({ role: LLM_ROLE[stage] ?? 'writer', stage, articleId, system, prompt, schema, schemaName, meta, temperature, maxTokens });

// Yazar notu yoksa model "kisisel deneyim" UYDURMASIN diye acik talimat verilir.
export const NO_NOTES = 'No first-hand notes were provided. Write in an impersonal voice and do not claim personal experience, projects or measurements.';
export const authorNotesText = ({ topic, theme }) => {
  const parts = [];
  if (topic?.topicAuthorNote?.trim()) parts.push(`Note for this article: ${topic.topicAuthorNote.trim()}`);
  if (theme?.themeExpertiseNotes?.trim()) parts.push(`General expertise notes (${theme.themeName}): ${theme.themeExpertiseNotes.trim()}`);
  return parts.length ? parts.join('\n') : NO_NOTES;
};

export const factsText = (brief, ids = []) => {
  const facts = (brief?.facts || []).filter((f) => ids.includes(f.id));
  return facts.length ? facts.map((f) => `[${f.id}] ${f.claim}\n    quote: "${f.quote}"\n    source: ${f.sourceUrl}`).join('\n') : '(none for this section: do not state external facts or figures)';
};
export const allFactsText = (brief) => (brief?.facts?.length ? brief.facts.map((f) => `[${f.id}] ${f.claim} (source: ${f.sourceUrl})`).join('\n') : '(no verified source facts were found: write from well-known, stable knowledge only, state no figures)');
export const sourcesText = (brief, ids = []) => {
  const urls = new Set((brief?.facts || []).filter((f) => ids.includes(f.id)).map((f) => f.sourceUrl));
  const list = (brief?.sources || []).filter((s) => urls.has(s.url));
  return list.length ? list.map((s) => `- ${s.title || s.url}: ${s.url}`).join('\n') : '(none: do not add links)';
};

export const outlineSummary = (outline) => outline.sections.map((s, i) => `${i + 1}. ${s.heading}: ${s.goal}`).join('\n');

export const loadContext = async ({ articleRepo, topicRepo, themeRepo, sectionRepo }, articleId) => {
  const article = await articleRepo.findById({ articleId });
  if (!article) throw new DomainError('ARTICLE_NOT_FOUND', 'article not found');
  const topic = await topicRepo.findById({ topicId: article.articleTopicId });
  const theme = topic ? await themeRepo.findById({ themeId: topic.topicThemeId }) : null;
  const sections = sectionRepo ? await sectionRepo.list({ articleId }) : [];
  return { article, topic, theme, sections, brief: article.articleResearchBrief, outline: article.articleOutline };
};

// Asama tamamlandi: makale kaydini (patch + son tamamlanan asama) ve denetim izini yazar.
export const completeStage = async ({ articleRepo, revisionRepo }, { articleId, stage, patch = {}, content = {}, model = null }) => {
  await articleRepo.update({ articleId, patch: { ...patch, pipelineStage: stage, error: null } });
  await revisionRepo.insert({ articleId, stage, model, content });
};
