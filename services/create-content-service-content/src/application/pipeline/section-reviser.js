import { renderPrompt } from '../../infrastructure/llm/prompt-loader.js';
import { groupIssuesBySection, headingKey } from '../../domain/article/issue-mapping.js';
import { countCodeBlocks, countDiagramBlocks, wordCount } from '../../domain/article/markdown.js';
import { cleanSectionBody } from '../../domain/article/section-validation.js';
import { factsText } from './common.js';

const fenceParityOk = (b) => b.split('\n').filter((l) => /^```/.test(l.trim())).length % 2 === 0;

// Bir revizyon yalniz gerekli sinirlari asmiyorsa kabul edilir: kod/diyagram sayisi dusmemeli, uzunluk -%50/+%60 icinde kalmali.
export const acceptRevision = (before, after) => {
  if (!after.trim() || !fenceParityOk(after)) return false;
  if (countCodeBlocks(after) < countCodeBlocks(before) || countDiagramBlocks(after) < countDiagramBlocks(before)) return false;
  const b = wordCount(before);
  const a = wordCount(after);
  return b === 0 || (a >= b * 0.5 && a <= b * 1.6);
};

// Sorunlari bolume gore gruplar ve YALNIZ sorunlu bolumleri yeniden yazar (redaktor ve hakem-geri-bildirimi turlari ortak kullanir).
// Kabul edilen govde hemen DB'ye yazilir. `changed` yalniz govdesi GERCEKTEN degisen bolumleri sayar.
export const makeSectionReviser = ({ ask, sectionRepo, nowFn = () => new Date() }) => async ({ articleId, article, outline, brief, sections, issues }) => {
  const { groups, unmatched } = groupIssuesBySection(issues, sections);
  let current = sections;
  const changed = [];
  const rejected = [];
  for (const { section, issues: list } of groups) {
    const text = list.map((i, n) => `${n + 1}. [${i.severity}] ${i.problem}\n   Fix: ${i.fix}`).join('\n');
    const { text: rewritten } = await ask({
      stage: 'revise-section',
      articleId,
      prompt: renderPrompt('revise-section', { title: article.articleTitle, thesis: outline.thesis, heading: headingKey(section), issues: text, facts: factsText(brief, section.plan?.factIds ?? []), body: section.body }),
      temperature: 0.5,
      maxTokens: 4000,
      meta: { body: section.body },
    });
    const next = cleanSectionBody(rewritten, section.heading);
    if (next === section.body) continue;
    if (acceptRevision(section.body, next)) {
      await sectionRepo.setBody({ sectionId: section.id, body: next, wordCount: wordCount(next), now: nowFn() });
      current = current.map((s) => (s.id === section.id ? { ...s, body: next } : s));
      changed.push(headingKey(section));
    } else rejected.push(headingKey(section));
  }
  return { sections: current, changed, rejected, unmatched: unmatched.length };
};
