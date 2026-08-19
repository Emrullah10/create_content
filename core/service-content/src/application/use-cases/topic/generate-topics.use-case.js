import { makeTopic } from '../../../domain/entities/topic.js';
import { isDuplicateTitle } from '../../../domain/policies/dedup-policy.js';
import { DuplicateTopicError } from '../../../domain/errors/index.js';

export const makeGenerateTopics = ({ topicRepo, themeRepo, aiClient }) => async ({ themeId, count = 20 }) => {
  const theme = await themeRepo.findById(themeId);
  const existingHashes = await topicRepo.listDedupHashes();
  const existingTitles = await topicRepo.listTitlesByTheme(themeId);

  const suggestions = await aiClient.generateTopics(theme, existingTitles, count);

  const created = [];
  for (const s of suggestions) {
    if (isDuplicateTitle(s.title, existingHashes)) continue;
    const topic = makeTopic({ themeId, title: s.title, angle: s.angle, keywords: s.keywords, status: 'suggested' });
    created.push(await topicRepo.create(topic));
    existingHashes.push(topic.dedupHash);
  }
  return created;
};
