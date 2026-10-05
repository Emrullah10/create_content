import { ResearchPlanSchema, FactsSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { verifyFacts, buildBrief } from '../../../domain/research/facts.js';
import { makeAsk, loadContext, completeStage } from '../../pipeline/common.js';

const MIN_FACTS_FOR_STRONG_RESEARCH = 3;

// ARASTIRMA: LLM nereye bakilacagini onerir; kaynaklar ucretsiz API'lerle ve dogrudan sayfa cekimiyle toplanir; her kaynaktan
// olgular cikarilir ve alinti kaynak metinde BIREBIR gecmiyorsa olgu KODLA atilir (uydurma alinti makaleye giremez).
export const makeResearchArticle = ({ llm, gather, articleRepo, topicRepo, themeRepo, sourceRepo, revisionRepo, systemPrompt }) => {
  for (const [n, d] of Object.entries({ llm, gather, articleRepo, topicRepo, themeRepo, sourceRepo, revisionRepo })) if (!d) throw new Error(`makeResearchArticle requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });

  return async ({ articleId }) => {
    const { topic } = await loadContext({ articleRepo, topicRepo, themeRepo }, articleId);
    const common = { title: topic.topicTitle, angle: topic.topicAngle || '(none)', keywords: (topic.topicKeywords || []).join(', ') };

    const { data: plan } = await ask({ stage: 'research-plan', articleId, prompt: renderPrompt('research-plan', common), schema: ResearchPlanSchema, schemaName: 'research_plan', temperature: 0.3, maxTokens: 2500 });
    const { sources: candidates, failures } = await gather(plan);

    const kept = [];
    for (const c of candidates) {
      try {
        const { data } = await ask({
          stage: 'research-facts',
          articleId,
          prompt: renderPrompt('research-facts', { ...common, source_title: c.title || c.url, source_url: c.url, source_text: c.text }),
          schema: FactsSchema,
          schemaName: 'facts',
          temperature: 0.1,
          maxTokens: 4000,
          meta: { sourceText: c.text },
        });
        const facts = verifyFacts(data.facts, c.text);
        if (facts.length) kept.push({ kind: c.kind, url: c.url, title: c.title, facts, verified: true });
      } catch (e) {
        failures.push({ source: `facts:${c.url}`, error: e.message }); // tek kaynagin hatasi arastirmayi durdurmaz
      }
    }

    const brief = { ...buildBrief(kept), weak: false, failures, queries: plan.queries };
    brief.weak = brief.facts.length < MIN_FACTS_FOR_STRONG_RESEARCH;
    await sourceRepo.replaceAll({ articleId, sources: kept });
    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'research', patch: { researchBrief: brief }, content: { queries: plan.queries, docUrls: plan.docUrls, candidates: candidates.length, keptSources: kept.length, facts: brief.facts.length, weak: brief.weak, failures } });
    return { stage: 'research', sources: kept.length, facts: brief.facts.length, weak: brief.weak };
  };
};
