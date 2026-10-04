import { jest } from '@jest/globals';
import { makeDailyContentOrchestrator } from '../../../../core/service-content/src/application/orchestrators/daily-content.orchestrator.js';

const TOPIC = { id: 'topic-1', slug: 'topic-1' };
const ARTICLE = { id: 'article-1', slug: 'article-1', bodyMarkdown: '![a](x.png)\n\ncontent', summary: 's' };

const makeDeps = (overrides = {}) => {
  const articleStore = { bodyMarkdown: ARTICLE.bodyMarkdown, summary: ARTICLE.summary };
  const topicRepo = { update: jest.fn().mockResolvedValue(undefined) };
  const articleRepo = {
    findById: jest.fn().mockImplementation(async () => ({ id: ARTICLE.id, ...articleStore })),
    update: jest.fn().mockImplementation(async (id, patch) => {
      Object.assign(articleStore, patch);
      return { id, ...articleStore };
    }),
  };

  return {
    pickNextTopic: jest.fn().mockResolvedValue(TOPIC),
    draftArticle: jest.fn().mockResolvedValue(ARTICLE),
    critiqueAndRevise: jest.fn().mockResolvedValue({}),
    renderDiagrams: jest.fn().mockResolvedValue([]),
    generateCover: jest.fn().mockResolvedValue({}),
    uploadAssets: jest.fn().mockResolvedValue([]),
    embedAssets: jest.fn().mockResolvedValue({ status: 'review', bodyMarkdown: articleStore.bodyMarkdown, summary: articleStore.summary }),
    scoreArticle: jest.fn(),
    targetedRevise: jest.fn(),
    articleRepo,
    topicRepo,
    qualityThreshold: 75,
    qualityMaxRounds: 2,
    ...overrides,
  };
};

describe('daily-content orchestrator: quality revision loop', () => {
  test('no revision rounds when the first score already meets the threshold', async () => {
    const deps = makeDeps();
    deps.scoreArticle.mockResolvedValue({ qualityScore: 88, qualityReport: { technical_depth: 4 } });

    const orchestrator = makeDailyContentOrchestrator(deps);
    const result = await orchestrator();

    expect(deps.targetedRevise).not.toHaveBeenCalled();
    expect(result.quality).toBe(88);
    expect(deps.topicRepo.update).toHaveBeenCalledWith(TOPIC.id, { status: 'used' });
  });

  test('revises once and stops as soon as the threshold is crossed', async () => {
    const deps = makeDeps();
    deps.scoreArticle
      .mockResolvedValueOnce({ qualityScore: 69, qualityReport: { technical_depth: 3 } })
      .mockResolvedValueOnce({ qualityScore: 76, qualityReport: { technical_depth: 4 } });
    deps.targetedRevise.mockResolvedValue({ bodyMarkdown: '![a](x.png)\n\nrevised content', summary: 'revised' });

    const orchestrator = makeDailyContentOrchestrator(deps);
    const result = await orchestrator();

    expect(deps.targetedRevise).toHaveBeenCalledTimes(1);
    expect(deps.scoreArticle).toHaveBeenCalledTimes(2);
    expect(result.quality).toBe(76);
  });

  test('keeps the best version when a revision round makes the score worse', async () => {
    const deps = makeDeps();
    deps.scoreArticle
      .mockResolvedValueOnce({ qualityScore: 70, qualityReport: { technical_depth: 3 } })
      .mockResolvedValueOnce({ qualityScore: 60, qualityReport: { technical_depth: 2 } });
    deps.targetedRevise.mockResolvedValue({ bodyMarkdown: '![a](x.png)\n\nworse content', summary: 'worse' });

    const orchestrator = makeDailyContentOrchestrator(deps);
    const result = await orchestrator();

    expect(result.quality).toBe(70);
    expect(deps.targetedRevise).toHaveBeenCalledTimes(1);
    const finalUpdateCall = deps.articleRepo.update.mock.calls.at(-1);
    expect(finalUpdateCall[1].qualityScore).toBe(70);
  });

  test('stops early when a round shows no improvement, without spending remaining rounds', async () => {
    const deps = makeDeps();
    deps.scoreArticle
      .mockResolvedValueOnce({ qualityScore: 70, qualityReport: { technical_depth: 3 } })
      .mockResolvedValueOnce({ qualityScore: 70, qualityReport: { technical_depth: 3 } });
    deps.targetedRevise.mockResolvedValue({ bodyMarkdown: '![a](x.png)\n\nsame quality content', summary: 's2' });

    const orchestrator = makeDailyContentOrchestrator(deps);
    await orchestrator();

    expect(deps.targetedRevise).toHaveBeenCalledTimes(1);
  });

  test('respects qualityMaxRounds even if every round improves but never crosses threshold', async () => {
    const deps = makeDeps({ qualityMaxRounds: 2 });
    deps.scoreArticle
      .mockResolvedValueOnce({ qualityScore: 60, qualityReport: { technical_depth: 2 } })
      .mockResolvedValueOnce({ qualityScore: 65, qualityReport: { technical_depth: 3 } })
      .mockResolvedValueOnce({ qualityScore: 70, qualityReport: { technical_depth: 3 } });
    deps.targetedRevise
      .mockResolvedValueOnce({ bodyMarkdown: '![a](x.png)\n\nround 1', summary: 's1' })
      .mockResolvedValueOnce({ bodyMarkdown: '![a](x.png)\n\nround 2', summary: 's2' });

    const orchestrator = makeDailyContentOrchestrator(deps);
    const result = await orchestrator();

    expect(deps.targetedRevise).toHaveBeenCalledTimes(2);
    expect(result.quality).toBe(70);
  });

  test('rejects a revision round that drops embedded images, keeping best', async () => {
    const deps = makeDeps();
    deps.scoreArticle.mockResolvedValueOnce({ qualityScore: 70, qualityReport: { technical_depth: 3 } });
    deps.targetedRevise.mockResolvedValue({ bodyMarkdown: 'content with no images at all', summary: 's2' });

    const orchestrator = makeDailyContentOrchestrator(deps);
    const result = await orchestrator();

    expect(deps.scoreArticle).toHaveBeenCalledTimes(1);
    expect(result.quality).toBe(70);
  });

  test('returns no_topic_available without touching any downstream use-case', async () => {
    const deps = makeDeps({ pickNextTopic: jest.fn().mockResolvedValue(null) });

    const orchestrator = makeDailyContentOrchestrator(deps);
    const result = await orchestrator();

    expect(result).toEqual({ status: 'no_topic_available' });
    expect(deps.draftArticle).not.toHaveBeenCalled();
  });
});
