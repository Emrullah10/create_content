import { EditorSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { runQualityChecks } from '../../../domain/article/quality-checks.js';
import { issuesFromChecks } from '../../../domain/article/issue-mapping.js';
import { assembleBody } from '../../../domain/article/section-markdown.js';
import { allowedTextOf } from '../../../domain/research/facts.js';
import { makeAsk, loadContext, completeStage, authorNotesText } from '../../pipeline/common.js';
import { makeCodeFixer } from '../../pipeline/code-fixer.js';
import { makeSectionReviser } from '../../pipeline/section-reviser.js';

export { acceptRevision } from '../../pipeline/section-reviser.js';

const checkReportText = (result) => result.checks.map((c) => `${c.ok ? 'OK ' : c.severity === 'error' ? 'ERR' : 'WARN'} ${c.id}: ${c.detail}`).join('\n');

// REDAKTOR + REVIZYON: deterministik kontrol basarisizliklari ve redaktor LLM'inin sorunlari BOLUM BAZINDA birlestirilir;
// yalniz sorunlu bolumler yeniden yazilir (en fazla `maxRounds` tur). Her turdan sonra kod yeniden dogrulanir ve kontroller tekrar kosulur.
export const makeEditArticle = ({ llm, checkCode, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo, thresholds = {}, maxRounds = 2, systemPrompt, nowFn = () => new Date() }) => {
  for (const [n, d] of Object.entries({ llm, checkCode, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo })) if (!d) throw new Error(`makeEditArticle requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });
  const fixCode = makeCodeFixer({ ask, checkCode, sectionRepo, nowFn });
  const reviseSections = makeSectionReviser({ ask, sectionRepo, nowFn });

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
      const revised = await reviseSections({ articleId, article, outline, brief, sections, issues });
      sections = revised.sections;
      rounds.push({ round, issues: issues.length, changed: revised.changed, rejected: revised.rejected, unmatched: revised.unmatched });
      if (!revised.changed.length) break; // ilerleme yok: bosuna donme
      sections = (await fixCode({ articleId, sections })).sections; // yeni yazilan kod da dogrulansin
    }

    const body = assembleBody(sections);
    const finalChecks = runQualityChecks({ body, allowedText, thresholds });
    const report = { ...(article.articleQualityReport || {}), checks: { passed: finalChecks.passed, items: finalChecks.checks, metrics: finalChecks.metrics }, editorRounds: rounds };
    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'revise', patch: { bodyMarkdown: body, qualityReport: report }, content: { rounds, passed: finalChecks.passed, remaining: finalChecks.errors.map((e) => e.id) } });
    return { stage: 'revise', rounds: rounds.length, passed: finalChecks.passed, remaining: finalChecks.errors.map((e) => e.id) };
  };
};
