import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { truncateAll, closeAllPools } from '../../../config/db-client.js';
import { bootServiceTest, shutdownServiceTest, HOST } from '../helpers/boot.js';

// HTTP uclarindan tam akis. LLM_PROVIDER=fake (worker-db.js) => install-ports sahte LLM + sahte portlar kurar.
const mount = '/api/create-content-service-content';
let app;
let container;
beforeAll(async () => {
  await bootServiceTest();
  ({ default: container } = await import('../../../../services/create-content-service-content/src/container.js'));
  const { installPortsFromEnv } = await import('../../../../services/create-content-service-content/src/infrastructure/install-ports.js');
  installPortsFromEnv({ recorder: (c) => container.repos.llmCallRepo.insert(c), logger: { warn() {} } });
  app = (await import('../../../../services/create-content-service-content/src/app.js')).buildApp();
});
beforeEach(() => truncateAll('content'));
afterAll(async () => {
  await shutdownServiceTest();
  await closeAllPools();
});

const api = {
  get: (p) => request(app).get(`${mount}${p}`).set(HOST),
  post: (p, body) => request(app).post(`${mount}${p}`).set(HOST).send(body ?? {}),
};
const waitFor = async (fn, { timeout = 30_000, every = 100 } = {}) => {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error('waitFor timeout');
    await new Promise((r) => setTimeout(r, every));
  }
};

describe('panel akışı (HTTP)', () => {
  test('tema -> konu öner -> onayla (yazar notu) -> şimdi yaz (arka plan) -> detay -> onayla', async () => {
    const theme = (await api.post('/v1/themes/create', { name: 'HTTP Theme', targetAudience: 'devs' })).body.data;

    const gen = await api.post('/v1/topics/generate', { themeCode: theme.themeCode, count: 3 });
    expect(gen.status).toBe(200);
    expect(gen.body.data.created).toHaveLength(3);
    const topic = gen.body.data.created[0];
    expect(topic.topicStatus).toBe('suggested');

    // onaylanmamış konu yazılmaz
    const idle = await api.post('/v1/pipeline/run');
    expect(idle.status).toBe(202);
    const idleJob = await waitFor(async () => (await api.get('/v1/dashboard')).body.data.jobs.find((j) => j.jobRunId === idle.body.data.jobRunId && j.jobRunStatus !== 'running'));
    expect(idleJob.jobRunStatus).toBe('skipped');

    const approved = await api.post(`/v1/topics/${topic.topicCode}/approve`, { authorNote: 'Real production note' });
    expect(approved.body.data).toMatchObject({ topicStatus: 'approved', topicAuthorNote: 'Real production note' });
    expect((await api.post(`/v1/topics/${topic.topicCode}/approve`)).status).toBe(409);

    const run = await api.post('/v1/pipeline/run', { topicCode: topic.topicCode });
    expect(run.status).toBe(202);
    const job = await waitFor(async () => (await api.get('/v1/dashboard')).body.data.jobs.find((j) => j.jobRunId === run.body.data.jobRunId && j.jobRunStatus !== 'running'));
    expect(job.jobRunStatus).toBe('succeeded');

    const list = (await api.get('/v1/articles/list?status=review')).body.data;
    expect(list.items).toHaveLength(1);
    expect(list.counts.review).toBe(1);
    const code = list.items[0].articleCode;
    const detail = (await api.get(`/v1/articles/${code}/detail`)).body.data;
    expect(detail.article.articleQualityScore).toBe(80);
    expect(detail.assets.length).toBeGreaterThanOrEqual(3);

    const edit = await api.post(`/v1/articles/${code}/update`, { title: 'Edited title' });
    expect(edit.body.data.articleTitle).toBe('Edited title');
    expect((await api.post(`/v1/articles/${code}/approve`)).body.data.articleStatus).toBe('approved');

    const dash = (await api.get('/v1/dashboard')).body.data;
    expect(dash).toMatchObject({ articles: { approved: 1 }, llm: { configured: true }, quality: { threshold: expect.any(Number) } });
    expect(dash.topics.used).toBe(1);
  }, 90_000);

  test('hatalar: bilinmeyen makale 404, geçersiz gövde 400, eksik izin yok ama doğrulama var', async () => {
    expect((await api.get('/v1/articles/999999/detail')).status).toBe(404);
    expect((await api.post('/v1/topics/create', { themeCode: '1' })).status).toBe(400);
    expect((await api.post('/v1/topics/generate', {})).status).toBe(400);
    expect((await api.post('/v1/pipeline/articles/999999/resume')).status).toBe(404);
  });
});
