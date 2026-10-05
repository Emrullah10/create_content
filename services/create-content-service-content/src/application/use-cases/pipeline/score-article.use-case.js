import { JudgeSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { aggregateJudgments, applyStructureCap } from '../../../domain/article/scoring.js';
import { makeAsk, loadContext, completeStage } from '../../pipeline/common.js';

// KOR HAKEM: hakem yalniz baslik + govde + kaynak listesini gorur; onceki skoru/raporu GORMEZ (eski surumde gorup ayni 72'ye sikisiyordu).
// `samples` ornek alinir, kriter basina MEDYAN kullanilir, agirlikli toplam KODDA hesaplanir. Yapi kontrolleri basarisizsa puan sinirlanir.
export const makeScoreArticle = ({ llm, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo, samples = 3, systemPrompt }) => {
  for (const [n, d] of Object.entries({ llm, articleRepo, topicRepo, themeRepo, revisionRepo })) if (!d) throw new Error(`makeScoreArticle requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });

  return async ({ articleId }) => {
    const { article, brief } = await loadContext({ articleRepo, topicRepo, themeRepo, sectionRepo }, articleId);
    const sources = brief?.sources?.length ? brief.sources.map((s) => `- ${s.title || s.url}: ${s.url}`).join('\n') : '(none)';
    const prompt = renderPrompt('judge', { title: article.articleTitle, sources, article: article.articleBodyMarkdown });

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

    const agg = aggregateJudgments(judgments);
    const checksPassed = article.articleQualityReport?.checks?.passed ?? false;
    const score = applyStructureCap(agg.score, checksPassed);
    const report = { ...(article.articleQualityReport || {}), score, rawScore: agg.score, capped: score !== agg.score, judge: { criteria: agg.criteria, strengths: agg.strengths, weaknesses: agg.weaknesses, samples: judgments.length, sampleErrors: errors } };
    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'score', patch: { qualityScore: score, qualityReport: report }, content: { score, rawScore: agg.score, criteria: Object.fromEntries(Object.entries(agg.criteria).map(([k, v]) => [k, v.samples])) } });
    return { stage: 'score', score, rawScore: agg.score, capped: score !== agg.score };
  };
};
