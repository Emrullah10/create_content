import { EditorSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { runQualityChecks } from '../../../domain/article/quality-checks.js';
import { issuesFromChecks, groupIssuesBySection, headingKey } from '../../../domain/article/issue-mapping.js';
import { assembleBody } from '../../../domain/article/section-markdown.js';
import { countCodeBlocks, countDiagramBlocks, wordCount } from '../../../domain/article/markdown.js';
import { cleanSectionBody } from '../../../domain/article/section-validation.js';
import { allowedTextOf } from '../../../domain/research/facts.js';
import { makeAsk, loadContext, completeStage, authorNotesText, factsText } from '../../pipeline/common.js';
import { makeCodeFixer } from '../../pipeline/code-fixer.js';

const fenceParityOk = (b) => b.split('\n').filter((l) => /^```/.test(l.trim())).length % 2 === 0;

// Bir revizyon yalniz gerekli sinirlari asmiyorsa kabul edilir: kod/diyagram sayisi dusmemeli, uzunluk -%50/+%60 icinde kalmali.
export const acceptRevision = (before, after) => {
  if (!after.trim() || !fenceParityOk(after)) return false;
  if (countCodeBlocks(after) < countCodeBlocks(before) || countDiagramBlocks(after) < countDiagramBlocks(before)) return false;
  const b = wordCount(before);
  const a = wordCount(after);
  return b === 0 || (a >= b * 0.5 && a <= b * 1.6);
};

const checkReportText = (result) => result.checks.map((c) => `${c.ok ? 'OK ' : c.severity === 'error' ? 'ERR' : 'WARN'} ${c.id}: ${c.detail}`).join('\n');

// REDAKTOR + REVIZYON: deterministik kontrol basarisizliklari ve redaktor LLM'inin sorunlari BOLUM BAZINDA birlestirilir;
// yalniz sorunlu bolumler yeniden yazilir (en fazla `maxRounds` tur). Her turdan sonra kod yeniden dogrulanir ve kontroller tekrar kosulur.
export const makeEditArticle = ({ llm, checkCode, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo, thresholds = {}, maxRounds = 2, systemPrompt, nowFn = () => new Date() }) => {
  for (const [n, d] of Object.entries({ llm, checkCode, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo })) if (!d) throw new Error(`makeEditArticle requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });
  const fixCode = makeCodeFixer({ ask, checkCode, sectionRepo, nowFn });

  return async ({ articleId }) => {
    let ctx = await loadContext({ articleRepo, topicRepo, themeRepo, sectionRepo }, articleId);
    const { article, topic, theme, brief, outline } = ctx;
    const allowedText = allowedTextOf(brief, authorNotesText({ topic, theme }));
    let sections = ctx.sections;
    const rounds = [];

    for (let round = 1; round <= maxRounds; round += 1) {
      const body = assembleBody(sections);
      const checkResult = runQualityChecks({ body, allowedText, thresholds });
      const stored = article.articleQualityReport?.code;
      const codeReport = stored?.failures?.length ? stored.failures.map((f) => `block #${f.index} (${f.lang}): ${f.error}`).join('\n') : '(all validated code blocks are syntactically valid)';
      const { data } = await ask({ stage: 'editor', articleId, prompt: renderPrompt('editor', { check_report: checkReportText(checkResult), code_report: codeReport, article: body }), schema: EditorSchema, schemaName: 'editor', temperature: 0.2, maxTokens: 4000 });

      const issues = [...issuesFromChecks({ checkResult, sections, allowedText, thresholds }), ...data.issues.map((i) => ({ ...i, source: 'editor' }))];
      if (!issues.length) {
        rounds.push({ round, issues: 0 });
        break;
      }
      const { groups, unmatched } = groupIssuesBySection(issues, sections);
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
        if (acceptRevision(section.body, next)) {
          await sectionRepo.setBody({ sectionId: section.id, body: next, wordCount: wordCount(next), now: nowFn() });
          sections = sections.map((s) => (s.id === section.id ? { ...s, body: next } : s));
          changed.push(headingKey(section));
        } else rejected.push(headingKey(section));
      }
      rounds.push({ round, issues: issues.length, changed, rejected, unmatched: unmatched.length });
      if (!changed.length) break; // ilerleme yok: bosuna donme
      sections = (await fixCode({ articleId, sections })).sections; // yeni yazilan kod da dogrulansin
    }

    const body = assembleBody(sections);
    const finalChecks = runQualityChecks({ body, allowedText, thresholds });
    const report = { ...(article.articleQualityReport || {}), checks: { passed: finalChecks.passed, items: finalChecks.checks, metrics: finalChecks.metrics }, editorRounds: rounds };
    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'revise', patch: { bodyMarkdown: body, qualityReport: report }, content: { rounds, passed: finalChecks.passed, remaining: finalChecks.errors.map((e) => e.id) } });
    return { stage: 'revise', rounds: rounds.length, passed: finalChecks.passed, remaining: finalChecks.errors.map((e) => e.id) };
  };
};
