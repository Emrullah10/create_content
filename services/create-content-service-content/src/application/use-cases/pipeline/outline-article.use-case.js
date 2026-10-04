import { OutlineSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { normalizeTags } from '../../../domain/theme/theme-rules.js';
import { makeAsk, loadContext, completeStage, authorNotesText, allFactsText } from '../../pipeline/common.js';

// OUTLINE: tez + bolum plani (kod/diyagram/tablo plani, hedef kelime, kullanilacak olgu id'leri). Ozgunluk burada dogar:
// yazar notu ve karsi-arguman bolumu plana girer.
export const makeOutlineArticle = ({ llm, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo, systemPrompt }) => {
  for (const [n, d] of Object.entries({ llm, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo })) if (!d) throw new Error(`makeOutlineArticle requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });

  return async ({ articleId }) => {
    const { topic, theme, brief } = await loadContext({ articleRepo, topicRepo, themeRepo }, articleId);
    const { data } = await ask({
      stage: 'outline',
      articleId,
      prompt: renderPrompt('outline', {
        title: topic.topicTitle,
        angle: topic.topicAngle || '(none)',
        keywords: (topic.topicKeywords || []).join(', '),
        target_audience: theme?.themeTargetAudience || 'working software developers',
        author_notes: authorNotesText({ topic, theme }),
        facts: allFactsText(brief),
      }),
      schema: OutlineSchema,
      schemaName: 'outline',
      temperature: 0.6,
      maxTokens: 6000,
      meta: { title: topic.topicTitle },
    });

    // Bilinmeyen olgu id'leri sessizce dusulur (modelin uydurdugu F99 gibi).
    const known = new Set((brief?.facts || []).map((f) => f.id));
    const outline = { ...data, sections: data.sections.map((s) => ({ ...s, factIds: s.factIds.filter((id) => known.has(id)) })) };

    await sectionRepo.replacePlan({ articleId, sections: outline.sections });
    await completeStage(
      { articleRepo, revisionRepo },
      { articleId, stage: 'outline', patch: { title: outline.title, subtitle: outline.subtitle, summary: outline.summary, tags: normalizeTags(outline.tags).slice(0, 4), outline }, content: { thesis: outline.thesis, sections: outline.sections.map((s) => ({ kind: s.kind, heading: s.heading, targetWords: s.targetWords })) } },
    );
    return { stage: 'outline', sections: outline.sections.length, thesis: outline.thesis };
  };
};
