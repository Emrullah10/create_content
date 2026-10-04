import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { initQueryBuilder } from 'app-query-builder';
import { rawQuery, withTransaction } from 'app-shared';
import tableDefs from '../../../../core/service-content/src/infrastructure/persistence/schemas/table-definitions.js';
import { truncateAll, closeAllPools } from '../../../config/db-client.js';
import { bootServiceTest, shutdownServiceTest } from '../helpers/boot.js';
import { makeThemeRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/theme.repository.js';
import { makeTopicRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/topic.repository.js';
import { makeArticleRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/article.repository.js';
import { makeSectionRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/section.repository.js';
import { makeRevisionRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/revision.repository.js';
import { makeResearchSourceRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/research-source.repository.js';
import { makeAssetRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/asset.repository.js';
import { makePublicationRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/publication.repository.js';
import { makeJobRunRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/job-run.repository.js';
import { makeLlmCallRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/llm-call.repository.js';

let r;
beforeAll(async () => {
  initQueryBuilder(tableDefs);
  await bootServiceTest();
  const deps = { rawQuery };
  r = {
    theme: makeThemeRepository(deps), topic: makeTopicRepository(deps), article: makeArticleRepository(deps), section: makeSectionRepository(deps),
    revision: makeRevisionRepository(deps), source: makeResearchSourceRepository(deps), asset: makeAssetRepository(deps),
    publication: makePublicationRepository(deps), job: makeJobRunRepository(deps), llm: makeLlmCallRepository(deps),
  };
});
beforeEach(() => truncateAll('content'));
afterAll(async () => { await shutdownServiceTest(); await closeAllPools(); });

const seed = async ({ title = 'Why MVCC beats locking for read-heavy workloads' } = {}) => {
  const theme = await r.theme.insert({ name: `T-${Math.random()}`, tags: ['pg'], weight: 2 });
  const topic = await r.topic.insert({ themeId: theme.themeId, title, angle: 'a', keywords: ['k'] });
  const article = await r.article.insert({ topicId: topic.topicId, title, slug: 'why-mvcc' });
  return { theme, topic, article };
};

describe('theme', () => {
  test('insert/update allow-list/listActive', async () => {
    const t = await r.theme.insert({ name: ' A ', tags: ['x'], expertiseNotes: 'n' });
    expect(t).toMatchObject({ themeName: 'A', themeTags: ['x'], themeExpertiseNotes: 'n', themeIsActive: true });
    const u = await r.theme.update({ themeCode: t.themeCode, patch: { weight: 5, isActive: false, tags: ['y'], bogus: 1 }, now: new Date() });
    expect(u).toMatchObject({ themeWeight: 5, themeIsActive: false, themeTags: ['y'] });
    expect(await r.theme.listActive()).toEqual([]);
    expect(await r.theme.update({ themeCode: t.themeCode, patch: { bogus: 1 } })).toBeNull();
  });
});

describe('topic', () => {
  test('birebir tekrar null (dedup), liste filtreleri ve sayımlar', async () => {
    const { theme, topic } = await seed();
    expect(await r.topic.insert({ themeId: theme.themeId, title: 'WHY mvcc beats locking, for read-heavy workloads!!' })).toBeNull();
    expect(topic).toMatchObject({ topicStatus: 'suggested', topicSource: 'ai', themeName: theme.themeName });
    expect((await r.topic.list({ status: 'suggested' })).length).toBe(1);
    expect((await r.topic.list({ status: 'approved' })).length).toBe(0);
    expect(await r.topic.countByStatus()).toEqual({ suggested: 1 });
  });

  test('transition: koşullu kapı ve yazar notu', async () => {
    const { topic } = await seed();
    const ok = await r.topic.transition({ topicCode: topic.topicCode, from: ['suggested'], to: 'approved', authorNote: 'I saw this in prod' });
    expect(ok).toMatchObject({ topicStatus: 'approved', topicAuthorNote: 'I saw this in prod' });
    expect(await r.topic.transition({ topicCode: topic.topicCode, from: ['suggested'], to: 'approved' })).toBeNull();
    const kept = await r.topic.transition({ topicCode: topic.topicCode, from: ['approved'], to: 'rejected' });
    expect(kept.topicAuthorNote).toBe('I saw this in prod');
  });

  test('claimNextApproved: en eski onaylı konu, aktif tema, yoksa null', async () => {
    const { theme, topic } = await seed();
    expect(await r.topic.claimNextApproved()).toBeNull();
    await r.topic.transition({ topicCode: topic.topicCode, from: 'suggested', to: 'approved' });
    const second = await r.topic.insert({ themeId: theme.themeId, title: 'Second approved topic about vacuum tuning', status: 'approved' });
    const claimed = await r.topic.claimNextApproved({ rng: () => 0 });
    expect(claimed.topicCode).toBe(topic.topicCode);
    expect(claimed.topicStatus).toBe('drafting');
    expect((await r.topic.claimNextApproved()).topicCode).toBe(second.topicCode);
    expect(await r.topic.claimNextApproved()).toBeNull();
    await r.theme.update({ themeCode: theme.themeCode, patch: { isActive: false } });
  });

  test('findSimilar (pg_trgm) ve recentTitles', async () => {
    await seed();
    const similar = await r.topic.findSimilar({ title: 'Why MVCC beats locking for read heavy workloads', threshold: 0.55 });
    expect(similar[0]).toMatchObject({ topicStatus: 'suggested' });
    expect(similar[0].similarity).toBeGreaterThan(0.55);
    expect(await r.topic.findSimilar({ title: 'Kubernetes ingress tuning', threshold: 0.55 })).toEqual([]);
    expect((await r.topic.recentTitles()).length).toBe(1);
  });
});

describe('article', () => {
  test('slug çakışması -2 ekler; update JSONB; durum kapısı', async () => {
    const { topic, article } = await seed();
    const second = await r.article.insert({ topicId: topic.topicId, title: 'Same', slug: 'why-mvcc' });
    expect(second.articleSlug).toBe('why-mvcc-2');
    const u = await r.article.update({ articleId: article.articleId, patch: { bodyMarkdown: 'body', tags: ['a'], qualityReport: { x: 1 }, pipelineStage: 'research', bogus: 1 } });
    expect(u).toMatchObject({ articleBodyMarkdown: 'body', articleTags: ['a'], articleQualityReport: { x: 1 }, articlePipelineStage: 'research' });
    const moved = await r.article.transition({ articleId: article.articleId, from: ['drafting'], to: 'review', patch: { qualityScore: 80 } });
    expect(moved).toMatchObject({ articleStatus: 'review', articleQualityScore: 80 });
    expect(await r.article.transition({ articleId: article.articleId, from: ['drafting'], to: 'approved' })).toBeNull();
    expect(await r.article.countByStatus()).toEqual({ review: 1, drafting: 1 });
    expect((await r.article.list({ status: 'review' })).length).toBe(1);
    expect((await r.article.findByCode({ articleCode: article.articleCode })).articleId).toBe(article.articleId);
  });

  test('geçersiz durum FK ile reddedilir', async () => {
    const { article } = await seed();
    await expect(r.article.update({ articleId: article.articleId, patch: { status: 'nonsense' } })).rejects.toMatchObject({ code: '23503' });
  });
});

describe('bölüm, revizyon, kaynak, asset', () => {
  test('bölüm planı yazılır, gövde dolar, yeniden planlama eskisini siler', async () => {
    const { article } = await seed();
    await r.section.replacePlan({ articleId: article.articleId, sections: [{ kind: 'intro', heading: 'Intro' }, { kind: 'body', heading: 'Core' }] });
    let list = await r.section.list({ articleId: article.articleId });
    expect(list.map((s) => [s.position, s.kind, s.heading, s.body])).toEqual([[1, 'intro', 'Intro', ''], [2, 'body', 'Core', '']]);
    await r.section.setBody({ sectionId: list[1].id, body: 'hello world', wordCount: 2 });
    list = await r.section.list({ articleId: article.articleId });
    expect(list[1]).toMatchObject({ body: 'hello world', wordCount: 2 });
    await r.section.replacePlan({ articleId: article.articleId, sections: [{ kind: 'intro', heading: 'Only' }] });
    expect((await r.section.list({ articleId: article.articleId })).length).toBe(1);
  });

  test('revizyon ve kaynak kayıtları', async () => {
    const { article } = await seed();
    await r.revision.insert({ articleId: article.articleId, stage: 'outline', model: 'm', content: { a: 1 }, inputTokens: 5, outputTokens: 6 });
    expect((await r.revision.listByArticle({ articleId: article.articleId }))[0]).toMatchObject({ articleRevisionStage: 'outline', articleRevisionContent: { a: 1 } });
    await r.source.replaceAll({ articleId: article.articleId, sources: [{ kind: 'web', url: 'https://a.example/', title: 'A', facts: [{ claim: 'c', quote: 'q' }] }, { kind: 'web', url: 'https://a.example/', title: 'dup' }] });
    const sources = await r.source.listByArticle({ articleId: article.articleId });
    expect(sources).toHaveLength(1);
    expect(sources[0].researchSourceFacts).toEqual([{ claim: 'c', quote: 'q' }]);
  });

  test('asset: diyagram upsert tekil, kapak tekil, güncelleme', async () => {
    const { article } = await seed();
    const d1 = await r.asset.upsertDiagram({ articleId: article.articleId, key: 'DIAGRAM_1', sourceCode: 'flowchart TD\nA-->B', caption: 'cap' });
    const d1b = await r.asset.upsertDiagram({ articleId: article.articleId, key: 'DIAGRAM_1', sourceCode: 'flowchart TD\nA-->C' });
    expect(d1b.id).toBe(d1.id);
    expect(d1b.sourceCode).toContain('A-->C');
    const c1 = await r.asset.upsertCover({ articleId: article.articleId, prompt: 'p1' });
    const c2 = await r.asset.upsertCover({ articleId: article.articleId, prompt: 'p2' });
    expect(c2.id).toBe(c1.id);
    const up = await r.asset.update({ assetId: d1.id, patch: { status: 'uploaded', remoteUrl: 'https://cdn/x.png', bogus: 1 } });
    expect(up).toMatchObject({ status: 'uploaded', remoteUrl: 'https://cdn/x.png' });
    expect((await r.asset.listByArticle({ articleId: article.articleId, kind: 'diagram' })).length).toBe(1);
    expect((await r.asset.listByArticle({ articleId: article.articleId, status: 'pending' })).map((a) => a.kind)).toEqual(['cover']);
  });
});

describe('yayın, iş, llm', () => {
  test('publication.ensure mevcut kaydı SIFIRLAMAZ (çift post engeli)', async () => {
    const { article } = await seed();
    const p = await r.publication.ensure({ articleId: article.articleId, platform: 'devto' });
    expect(p).toMatchObject({ publicationStatus: 'pending', publicationAttemptCount: 0 });
    await r.publication.update({ publicationId: p.publicationId, patch: { status: 'published', externalId: '123', externalUrl: 'https://dev.to/x' } });
    const again = await r.publication.ensure({ articleId: article.articleId, platform: 'devto' });
    expect(again).toMatchObject({ publicationStatus: 'published', publicationExternalId: '123' });
    await r.publication.update({ publicationId: p.publicationId, patch: { status: 'failed' } });
    await r.publication.incrementAttempts({ publicationId: p.publicationId });
    expect((await r.publication.listRetryable({ maxAttempts: 5 })).length).toBe(1);
    expect((await r.publication.listRetryable({ maxAttempts: 1 })).length).toBe(0);
    expect((await r.publication.listAll())[0]).toMatchObject({ articleTitle: article.articleTitle });
  });

  test('job_run yaşam döngüsü ve yetim temizliği', async () => {
    const j = await r.job.start({ jobName: 'daily-content' });
    expect(j.jobRunStatus).toBe('running');
    expect(await r.job.failOrphans()).toBe(1);
    const j2 = await r.job.start({ jobName: 'daily-content' });
    const done = await r.job.finish({ jobRunId: j2.jobRunId, status: 'succeeded', stats: { articles: 1 } });
    expect(done).toMatchObject({ jobRunStatus: 'succeeded', jobRunStats: { articles: 1 } });
    expect((await r.job.latest({ jobName: 'daily-content' })).length).toBe(2);
  });

  test('llm_call özeti aşama ve rol bazlı toplar', async () => {
    const { article } = await seed();
    await r.llm.insert({ articleId: article.articleId, role: 'writer', stage: 'section', model: 'm', inputTokens: 10, outputTokens: 20, durationMs: 100 });
    await r.llm.insert({ articleId: article.articleId, role: 'writer', stage: 'section', model: 'm', inputTokens: 5, outputTokens: 5, durationMs: 50, status: 'error', error: 'x' });
    expect(await r.llm.summaryByArticle({ articleId: article.articleId })).toEqual([{ stage: 'section', role: 'writer', calls: 2, inputTokens: 15, outputTokens: 25, durationMs: 150, errors: 1 }]);
  });
});

describe('transaction', () => {
  test('tx içinde yazılan satır rollback ile geri alınır', async () => {
    const { topic } = await seed();
    await expect(
      withTransaction(async (tx) => {
        await r.article.insert({ topicId: topic.topicId, title: 'tx', slug: 'tx-slug' }, { tx });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect((await r.article.list()).map((a) => a.articleSlug)).toEqual(['why-mvcc']);
  });
});
