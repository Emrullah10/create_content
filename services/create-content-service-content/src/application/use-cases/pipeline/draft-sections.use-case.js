import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { assembleBody } from '../../../domain/article/section-markdown.js';
import { wordCount } from '../../../domain/article/markdown.js';
import { cleanSectionBody, validateSection, writingOrder, lastParagraph } from '../../../domain/article/section-validation.js';
import { makeAsk, loadContext, completeStage, authorNotesText, factsText, sourcesText, outlineSummary } from '../../pipeline/common.js';

// TASLAK: her bolum AYRI bir cagrida DUZ MARKDOWN olarak yazilir (JSON icinde uzun metin yok). Uzunluk boylece dogal tutar;
// "expand" ile sisirme gerekmez. Yarim kalan pipeline devam eder: govdesi dolu bolumler atlanir.
export const makeDraftSections = ({ llm, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo, systemPrompt, nowFn = () => new Date() }) => {
  for (const [n, d] of Object.entries({ llm, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo })) if (!d) throw new Error(`makeDraftSections requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });

  return async ({ articleId }) => {
    const ctx = await loadContext({ articleRepo, topicRepo, themeRepo, sectionRepo }, articleId);
    const { article, topic, theme, brief, outline } = ctx;
    let sections = ctx.sections;
    const warnings = [];
    const done = new Map(sections.filter((s) => s.body.trim()).map((s) => [s.position, s.body]));

    for (const section of writingOrder(sections)) {
      if (done.has(section.position)) continue;
      const plan = section.plan;
      const byPos = new Map(sections.map((s) => [s.position, { ...s, body: done.get(s.position) ?? s.body }]));
      const before = [...byPos.values()].filter((s) => s.position < section.position && s.body.trim()).pop();
      const previousTail = section.kind === 'intro' ? '(this is the opening of the article)' : section.kind === 'conclusion' ? lastParagraph([...byPos.values()].filter((s) => s.kind === 'counterpoint' || s.kind === 'body').pop()?.body || '') || '(none)' : before ? lastParagraph(before.body) || '(none)' : '(this is the first section after the introduction)';
      const basePrompt = renderPrompt('section', {
        title: article.articleTitle,
        thesis: outline.thesis,
        position: section.position,
        total: sections.length,
        heading: section.heading,
        kind: plan.kind,
        goal: plan.goal,
        target_words: plan.targetWords,
        outline_summary: outlineSummary(outline),
        previous_tail: previousTail,
        facts: factsText(brief, plan.factIds),
        sources: sourcesText(brief, plan.factIds),
        author_notes: authorNotesText({ topic, theme }),
        code_plan: plan.codePlan ? `include ONE ${plan.codePlan.language} code block that shows: ${plan.codePlan.shows}` : 'no code block required',
        diagram_plan: plan.diagramPlan ? `include ONE mermaid ${plan.diagramPlan.type} diagram that shows: ${plan.diagramPlan.shows}` : 'no diagram',
        table_hint: plan.tableHint ? `include a markdown comparison table that ${plan.tableHint}` : 'no table',
      });
      const meta = { heading: section.heading, kind: plan.kind, targetWords: plan.targetWords, codePlan: plan.codePlan, diagramPlan: plan.diagramPlan, tableHint: plan.tableHint };

      let body = cleanSectionBody((await ask({ stage: 'section', articleId, prompt: basePrompt, temperature: 0.7, maxTokens: 4000, meta })).text, section.heading);
      let problems = validateSection(plan, body);
      if (problems.length) {
        // Tek duzeltme turu: sorunlar modele geri beslenir.
        const retry = cleanSectionBody((await ask({ stage: 'section', articleId, prompt: `${basePrompt}\n\nYour previous attempt had these problems, fix them all:\n- ${problems.join('\n- ')}`, temperature: 0.5, maxTokens: 4000, meta })).text, section.heading);
        const retryProblems = validateSection(plan, retry);
        if (retryProblems.length <= problems.length) {
          body = retry;
          problems = retryProblems;
        }
      }
      if (problems.length) warnings.push({ heading: section.heading, problems });
      await sectionRepo.setBody({ sectionId: section.id, body, wordCount: wordCount(body), now: nowFn() });
      done.set(section.position, body);
      sections = sections.map((s) => (s.id === section.id ? { ...s, body } : s));
    }

    const finalSections = await sectionRepo.list({ articleId });
    const body = assembleBody(finalSections);
    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'draft', patch: { bodyMarkdown: body }, content: { words: wordCount(body), sectionWords: finalSections.map((s) => ({ heading: s.heading, words: s.wordCount })), warnings } });
    return { stage: 'draft', words: wordCount(body), warnings: warnings.length };
  };
};
