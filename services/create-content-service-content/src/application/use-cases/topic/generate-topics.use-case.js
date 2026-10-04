import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { SIMILARITY_THRESHOLD } from '../../../domain/topic/topic-rules.js';
import { TopicListSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { makeAsk } from '../../pipeline/common.js';

// Temadan konu onerir. Kuyruk sinirinda (suggested >= max) YENI ONERI URETILMEZ (onaylanmayan konular birikmesin).
// Tekrar kontrolu: birebir (dedup_key UNIQUE) + pg_trgm benzerligi; benzer olanlar atlanir ve nedeni dondurulur.
export const makeGenerateTopics = ({ llm, themeRepo, topicRepo, suggestedMax = 15, systemPrompt }) => {
  for (const [n, d] of Object.entries({ llm, themeRepo, topicRepo })) if (!d) throw new Error(`makeGenerateTopics requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });

  return async ({ caller, themeCode, count = 10 } = {}) => {
    requireCallerPermission(caller, PERMISSIONS.contentManage);
    if (!themeCode) throw new DomainError('THEME_CODE_REQUIRED', 'themeCode is required');
    const theme = await themeRepo.findByCode({ themeCode });
    if (!theme) throw new DomainError('THEME_NOT_FOUND', 'theme not found');

    const counts = await topicRepo.countByStatus({});
    const room = suggestedMax - (counts.suggested ?? 0);
    if (room <= 0) throw new DomainError('TOPIC_QUEUE_FULL', `There are already ${counts.suggested} suggested topics waiting for approval (max ${suggestedMax}). Approve or reject some first.`, { suggested: counts.suggested, max: suggestedMax });
    const want = Math.min(Math.max(1, Math.floor(count)), room, 20);

    const existing = await topicRepo.recentTitles({ limit: 80 });
    const { data } = await ask({
      stage: 'topics',
      prompt: renderPrompt('topics', {
        count: want,
        theme_name: theme.themeName,
        theme_description: theme.themeDescription || '(none)',
        target_audience: theme.themeTargetAudience || 'working software developers',
        theme_tags: (theme.themeTags || []).join(', ') || '(none)',
        expertise_notes: theme.themeExpertiseNotes || '(none)',
        existing_titles: existing.length ? existing.map((t) => `- ${t}`).join('\n') : '(none yet)',
      }),
      schema: TopicListSchema,
      schemaName: 'topics',
      temperature: 0.9,
      maxTokens: 3000,
      meta: { count: want },
    });

    const created = [];
    const skipped = [];
    for (const t of data.topics) {
      if (created.length >= want) break;
      const similar = await topicRepo.findSimilar({ title: t.title, threshold: SIMILARITY_THRESHOLD });
      if (similar.length) {
        skipped.push({ title: t.title, reason: 'similar', similarTo: similar[0].topicTitle, similarity: similar[0].similarity });
        continue;
      }
      const row = await topicRepo.insert({ themeId: theme.themeId, title: t.title, angle: t.angle, keywords: t.keywords, userId: caller.callerUserId });
      if (row) created.push(row);
      else skipped.push({ title: t.title, reason: 'duplicate' });
    }
    return { created, skipped };
  };
};
