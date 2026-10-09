import { EditorSchema, JudgeSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { aggregateJudgments, applyStructureCap } from '../../../domain/article/scoring.js';
import { runQualityChecks } from '../../../domain/article/quality-checks.js';
import { issuesFromChecks } from '../../../domain/article/issue-mapping.js';
import { assembleBody } from '../../../domain/article/section-markdown.js';
import { wordCount } from '../../../domain/article/markdown.js';
import { allowedTextOf } from '../../../domain/research/facts.js';
import { makeAsk, loadContext, completeStage, authorNotesText } from '../../pipeline/common.js';
import { makeCodeFixer } from '../../pipeline/code-fixer.js';
import { makeSectionReviser } from '../../pipeline/section-reviser.js';

const failedChecksText = (checks) => checks.checks.filter((c) => !c.ok).map((c) => `${c.severity === 'error' ? 'ERR' : 'WARN'} ${c.id}: ${c.detail}`).join('\n') || '(none)';

// KOR HAKEM: hakem yalniz baslik + govde + kaynak listesini gorur; onceki skoru/raporu GORMEZ (eski surumde gorup ayni 72'ye sikisiyordu).
// `samples` ornek alinir, kriter basina MEDYAN kullanilir, agirlikli toplam KODDA hesaplanir. Yapi kontrolleri basarisizsa puan sinirlanir.
// IYILESTIRME DONGUSU: puan `threshold` altindaysa (en fazla `improveRounds` tur) hakemin eleştirisi ayri bir LLM cagrisiyla ('improve')
// bolum bazli duzeltmelere cevrilir, yalniz o bolumler yeniden yazilir ve makale YENIDEN kor puanlanir. Yeni surum daha yuksek puan
// almazsa bolumler eski haline dondurulur ve dongu durur (hakem gurultusu yuzunden kotulesen surum asla kalmaz).
export const makeScoreArticle = ({ llm, checkCode, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo, samples = 3, threshold = 75, improveRounds = 2, thresholds = {}, systemPrompt, nowFn = () => new Date() }) => {
  for (const [n, d] of Object.entries({ llm, articleRepo, topicRepo, themeRepo, revisionRepo })) if (!d) throw new Error(`makeScoreArticle requires { ${n} }`);
  if (improveRounds > 0 && (!sectionRepo || !checkCode)) throw new Error('makeScoreArticle requires { sectionRepo, checkCode } when improveRounds > 0');
  const ask = makeAsk({ llm, system: systemPrompt });
  const fixCode = checkCode ? makeCodeFixer({ ask, checkCode, sectionRepo, nowFn }) : null;
  const reviseSections = sectionRepo ? makeSectionReviser({ ask, sectionRepo, nowFn }) : null;

  const judge = async ({ articleId, title, sources, body }) => {
    const prompt = renderPrompt('judge', { title, sources, article: body });
    const judgments = [];
    const errors = [];
    for (let i = 0; i < samples; i += 1) {
      try {
        judgments.push((await ask({ stage: 'judge', articleId, prompt, schema: JudgeSchema, schemaName: 'judge', temperature: 0.3, maxTokens: 4000 })).data);
      } catch (e) {
        errors.push(e.message);
      }
    }
    if (!judgments.length) throw new Error(`judge produced no valid score: ${errors.join('; ')}`);
    return { ...aggregateJudgments(judgments), samples: judgments.length, errors };
  };

  const feedbackIssues = async ({ articleId, agg, checks, body }) => {
    const criteria = Object.entries(agg.criteria).map(([k, v]) => `- ${k}: ${v.score}/5. ${v.reasoning}`).join('\n');
    const prompt = renderPrompt('improve', { criteria, weaknesses: agg.weaknesses.map((w) => `- ${w}`).join('\n'), check_report: failedChecksText(checks), article: body });
    const { data } = await ask({ stage: 'improve', articleId, prompt, schema: EditorSchema, schemaName: 'editor', temperature: 0.2, maxTokens: 4000 });
    return data.issues.map((i) => ({ ...i, source: 'judge' }));
  };

  // Aday turdan geri donus: DB'deki bolum govdelerini `keep` surumune yazar.
  const restore = async (keep, candidate) => {
    const byId = new Map(keep.map((s) => [s.id, s.body]));
    for (const s of candidate) {
      const body = byId.get(s.id);
      if (body !== undefined && body !== s.body) await sectionRepo.setBody({ sectionId: s.id, body, wordCount: wordCount(body), now: nowFn() });
    }
  };

  return async ({ articleId }) => {
    const { article, topic, theme, sections: stored, brief, outline } = await loadContext({ articleRepo, topicRepo, themeRepo, sectionRepo }, articleId);
    const sources = brief?.sources?.length ? brief.sources.map((s) => `- ${s.title || s.url}: ${s.url}`).join('\n') : '(none)';
    const allowedText = allowedTextOf(brief, authorNotesText({ topic, theme }));
    const runChecks = (body) => runQualityChecks({ body, allowedText, thresholds });
    const evaluate = async (body) => {
      const agg = await judge({ articleId, title: article.articleTitle, sources, body });
      const checks = runChecks(body);
      return { body, agg, checks, score: applyStructureCap(agg.score, checks.passed) };
    };

    // Bolumler varsa govde onlardan kurulur: dongu ortasinda kesilip yeniden baslayan asama guncel bolumleri puanlar.
    const startBody = stored.length ? assembleBody(stored) : article.articleBodyMarkdown;
    let best = { ...(await evaluate(startBody)), sections: stored };
    const initialScore = best.score;
    const rounds = [];

    for (let round = 1; round <= improveRounds && best.score < threshold && best.sections.length; round += 1) {
      let candidateSections = best.sections;
      try {
        const issues = [...issuesFromChecks({ checkResult: best.checks, sections: best.sections, allowedText, thresholds }), ...(await feedbackIssues({ articleId, agg: best.agg, checks: best.checks, body: best.body }))];
        if (!issues.length) {
          rounds.push({ round, issues: 0, before: best.score });
          break;
        }
        const revised = await reviseSections({ articleId, article, outline, brief, sections: best.sections, issues });
        candidateSections = revised.sections;
        if (!revised.changed.length) {
          rounds.push({ round, issues: issues.length, changed: [], rejected: revised.rejected, before: best.score });
          break;
        }
        candidateSections = (await fixCode({ articleId, sections: candidateSections })).sections;
        const candidate = await evaluate(assembleBody(candidateSections));
        const kept = candidate.score > best.score;
        rounds.push({ round, issues: issues.length, changed: revised.changed, rejected: revised.rejected, before: best.score, after: candidate.score, kept });
        if (!kept) {
          await restore(best.sections, candidateSections);
          break;
        }
        best = { ...candidate, sections: candidateSections };
      } catch (e) {
        // Iyilestirme turu basarisiz (orn. hakem dustu): ilk puan zaten var; yarim kalan yeniden yazimi geri al ve elimizdekiyle devam et.
        await restore(best.sections, candidateSections);
        rounds.push({ round, error: e.message, before: best.score });
        break;
      }
    }

    const { agg, checks, score } = best;
    const report = {
      ...(article.articleQualityReport || {}),
      checks: { passed: checks.passed, items: checks.checks, metrics: checks.metrics },
      score,
      rawScore: agg.score,
      capped: score !== agg.score,
      judge: { criteria: agg.criteria, strengths: agg.strengths, weaknesses: agg.weaknesses, samples: agg.samples, sampleErrors: agg.errors },
      improveRounds: rounds,
      initialScore,
    };
    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'score', patch: { bodyMarkdown: best.body, qualityScore: score, qualityReport: report }, content: { score, rawScore: agg.score, initialScore, improveRounds: rounds, criteria: Object.fromEntries(Object.entries(agg.criteria).map(([k, v]) => [k, v.samples])) } });
    return { stage: 'score', score, rawScore: agg.score, capped: score !== agg.score, initialScore, improveRounds: rounds.length };
  };
};
