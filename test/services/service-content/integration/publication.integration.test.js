import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { initQueryBuilder } from 'app-query-builder';
import { rawQuery, OPERATOR_CALLER, SYSTEM_CALLER } from 'app-shared';
import tableDefs from '../../../../core/service-content/src/infrastructure/persistence/schemas/table-definitions.js';
import { truncateAll, closeAllPools } from '../../../config/db-client.js';
import { bootServiceTest, shutdownServiceTest } from '../helpers/boot.js';
import { makeFakePublisher } from '../../../../services/create-content-service-content/src/infrastructure/publishers/fake.publisher.js';

let buildContainer;
beforeAll(async () => {
  initQueryBuilder(tableDefs);
  await bootServiceTest();
  ({ buildContainer } = await import('../../../../services/create-content-service-content/src/container.js'));
});
beforeEach(() => truncateAll('content'));
afterAll(async () => {
  await shutdownServiceTest();
  await closeAllPools();
});

const setup = (config = {}) => {
  const fake = makeFakePublisher();
  const container = buildContainer({ rawQueryFn: rawQuery, translateHttpErrors: false, llm: { complete: async () => { throw new Error('no llm'); } }, llmConfigured: () => true, config: { devtoPublishMode: 'draft', qualityThreshold: 70, ...config }, ports: { devto: fake.publisher } });
  return { container, fake };
};

// Onayli bir makale kur (pipeline kosmadan, dogrudan repo ile).
const seedApproved = async (container, { status = 'approved' } = {}) => {
  const theme = await container.repos.themeRepo.insert({ name: `T${Math.random()}`, tags: [] });
  const topic = await container.repos.topicRepo.insert({ themeId: theme.themeId, title: 'Why MVCC beats row locking', status: 'used' });
  const article = await container.repos.articleRepo.insert({ topicId: topic.topicId, title: 'Why MVCC beats row locking', slug: 'why-mvcc' });
  await container.repos.articleRepo.update({ articleId: article.articleId, patch: { bodyMarkdown: '## Hello\n\nBody text.', summary: 'A short summary.', tags: ['postgres', 'mvcc'], status } });
  return container.repos.articleRepo.findById({ articleId: article.articleId });
};
const publish = (container, article, mode) => container.useCases.publication.publishToDevto({ caller: OPERATOR_CALLER, articleCode: article.articleCode, mode });

describe('dev.to yayını', () => {
  test('draft -> live: tek POST, sonra PUT; makale published, canonical yazılır, Medium pending_import', async () => {
    const { container, fake } = setup();
    const article = await seedApproved(container);

    const draft = await publish(container, article, 'draft');
    expect(draft.publication).toMatchObject({ publicationStatus: 'draft', publicationExternalId: '1000' });
    expect(draft.article.articleStatus).toBe('approved'); // taslak: makale hala onayli
    expect(fake.articles).toHaveLength(1);
    expect(fake.articles[0].payload).toMatchObject({ published: false, tags: ['postgres', 'mvcc'], description: 'A short summary.' });

    const live = await publish(container, article, 'live');
    expect(fake.articles).toHaveLength(1); // ikinci POST YOK
    expect(fake.state.calls.map((c) => c[0])).toEqual(['create', 'update']);
    expect(live.article).toMatchObject({ articleStatus: 'published', articleCanonicalUrl: expect.stringContaining('https://dev.to/fake/') });
    expect(live.publication).toMatchObject({ publicationStatus: 'published', publicationExternalId: '1000' });

    const medium = await container.repos.publicationRepo.find({ articleId: article.articleId, platform: 'medium' });
    expect(medium).toMatchObject({ publicationStatus: 'pending_import' });
    expect(medium.publicationMetadata.importUrl).toBe(`https://medium.com/p/import?url=${encodeURIComponent(live.article.articleCanonicalUrl)}`);

    // Tekrar canli yayin: HIC ag cagrisi yapilmaz.
    const callsBefore = fake.state.calls.length;
    expect(await publish(container, article, 'live')).toMatchObject({ alreadyPublished: true });
    expect(fake.state.calls.length).toBe(callsBefore);
  });

  test('varsayılan kip config\'ten gelir (draft); geçersiz kip reddedilir', async () => {
    const { container, fake } = setup({ devtoPublishMode: 'draft' });
    const article = await seedApproved(container);
    await container.useCases.publication.publishToDevto({ caller: OPERATOR_CALLER, articleCode: article.articleCode });
    expect(fake.articles[0].published).toBe(false);
    await expect(publish(container, article, 'public')).rejects.toMatchObject({ code: 'PUBLISH_MODE_INVALID' });
  });

  test('yalnız onaylı makale yayınlanır', async () => {
    const { container } = setup();
    const article = await seedApproved(container, { status: 'review' });
    await expect(publish(container, article, 'live')).rejects.toMatchObject({ code: 'ARTICLE_NOT_PUBLISHABLE' });
  });

  test('BELİRSİZ HATA: POST 5xx ama yayın yapılmış -> tekrar denemede var olan benimsenir, ÇİFT YAYIN YOK', async () => {
    const { container, fake } = setup();
    const article = await seedApproved(container);
    fake.state.failNext = { phase: 'create', status: 502, persist: true };
    await expect(publish(container, article, 'live')).rejects.toMatchObject({ code: 'PUBLISH_FAILED' });
    expect(fake.articles).toHaveLength(1); // dev.to'da var
    let current = await container.repos.articleRepo.findById({ articleId: article.articleId });
    expect(current.articleStatus).toBe('approved'); // publishing'de takili KALMADI
    expect(await container.repos.publicationRepo.find({ articleId: article.articleId, platform: 'devto' })).toMatchObject({ publicationStatus: 'failed', publicationAttemptCount: 1, publicationError: expect.stringContaining('502') });

    const retry = await publish(container, article, 'live');
    expect(fake.articles).toHaveLength(1); // yeni POST atilmadi
    expect(fake.state.calls.map((c) => c[0])).toEqual(['create', 'findByTitle', 'update']);
    expect(retry.article.articleStatus).toBe('published');
    expect(retry.publication.publicationExternalId).toBe('1000');
    current = await container.repos.articleRepo.findById({ articleId: article.articleId });
    expect(current.articleStatus).toBe('published');
  });

  test('yayın yapılmadan hata: tekrar denemede POST atılır', async () => {
    const { container, fake } = setup();
    const article = await seedApproved(container);
    fake.state.failNext = { phase: 'create', status: 500, persist: false };
    await expect(publish(container, article, 'live')).rejects.toMatchObject({ code: 'PUBLISH_FAILED' });
    expect(fake.articles).toHaveLength(0);
    await publish(container, article, 'live');
    expect(fake.articles).toHaveLength(1);
  });

  test('cron yeniden deneme: yalnız failed + onaylı makale, son denemenin kipiyle', async () => {
    const { container, fake } = setup();
    const article = await seedApproved(container);
    fake.state.failNext = { phase: 'create', status: 500, persist: false };
    await expect(publish(container, article, 'live')).rejects.toBeTruthy();
    const out = await container.useCases.publication.retryFailed({ caller: SYSTEM_CALLER });
    expect(out).toMatchObject({ retried: 1, succeeded: 1 });
    expect(fake.articles[0].published).toBe(true); // kip metadata'dan geldi
    expect((await container.useCases.publication.retryFailed({ caller: SYSTEM_CALLER })).retried).toBe(0);
  });

  test('deneme sınırı aşılınca cron bırakır', async () => {
    const { container, fake } = setup();
    const article = await seedApproved(container);
    for (let i = 0; i < 5; i += 1) {
      fake.state.failNext = { phase: 'create', status: 500, persist: false };
      await expect(publish(container, article, 'live')).rejects.toBeTruthy();
    }
    expect((await container.useCases.publication.retryFailed({ caller: SYSTEM_CALLER })).retried).toBe(0);
  });
});

describe('Medium aktarma onayı', () => {
  test('yalnız canlı yayından sonra, yalnız medium.com adresiyle', async () => {
    const { container } = setup();
    const article = await seedApproved(container);
    const confirm = (url) => container.useCases.publication.confirmMediumImport({ caller: OPERATOR_CALLER, articleCode: article.articleCode, mediumUrl: url });
    await expect(confirm('https://medium.com/@me/post-123')).rejects.toMatchObject({ code: 'ARTICLE_NOT_PUBLISHED' });
    await publish(container, article, 'live');
    await expect(confirm('https://evil.example/medium.com/x')).rejects.toMatchObject({ code: 'MEDIUM_URL_INVALID' });
    await expect(confirm('http://medium.com/x')).rejects.toMatchObject({ code: 'MEDIUM_URL_INVALID' });
    const ok = await confirm('https://me.medium.com/post-123');
    expect(ok).toMatchObject({ publicationStatus: 'published', publicationExternalUrl: 'https://me.medium.com/post-123' });
    const list = await container.useCases.publication.list({ caller: OPERATOR_CALLER });
    expect(list.items.map((p) => [p.publicationPlatform, p.publicationStatus]).sort()).toEqual([['devto', 'published'], ['medium', 'published']]);
  });
});

describe('dev.to senkronu (elle yayına alınan taslak)', () => {
  test('dev.to panelinde yayına alınan taslak: publication published, makale published, Medium pending_import', async () => {
    const { container, fake } = setup();
    const article = await seedApproved(container);
    await publish(container, article, 'draft');
    expect(await container.useCases.publication.sync({ caller: OPERATOR_CALLER })).toEqual({ checked: 1, updated: 0 });

    fake.articles[0].published = true; // kullanici dev.to'dan yayina aldi
    expect(await container.useCases.publication.sync({ caller: OPERATOR_CALLER })).toEqual({ checked: 1, updated: 1 });
    const pubs = await container.repos.publicationRepo.listByArticle({ articleId: article.articleId });
    expect(pubs.find((p) => p.publicationPlatform === 'devto')).toMatchObject({ publicationStatus: 'published' });
    expect(pubs.find((p) => p.publicationPlatform === 'medium')).toMatchObject({ publicationStatus: 'pending_import' });
    expect((await container.repos.articleRepo.findById({ articleId: article.articleId })).articleStatus).toBe('published');
  });
});
