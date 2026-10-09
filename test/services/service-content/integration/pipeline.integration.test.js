import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { initQueryBuilder } from 'app-query-builder';
import { rawQuery, OPERATOR_CALLER, SYSTEM_CALLER } from 'app-shared';
import tableDefs from '../../../../core/service-content/src/infrastructure/persistence/schemas/table-definitions.js';
import { truncateAll, closeAllPools } from '../../../config/db-client.js';
import { bootServiceTest, shutdownServiceTest } from '../helpers/boot.js';
import { makeLlmCallRepository } from '../../../../services/create-content-service-content/src/infrastructure/persistence/repositories/llm-call.repository.js';
import { makeFakeLlm } from '../../../../services/create-content-service-content/src/infrastructure/llm/fake.adapter.js';
import { makeFakeResearch, makeFakeRenderer } from '../../../../services/create-content-service-content/src/infrastructure/fakes.js';
import { makeFakeCoverGenerator } from '../../../../services/create-content-service-content/src/infrastructure/image/cloudflare-flux.adapter.js';
import { makeFakeAssetHost } from '../../../../services/create-content-service-content/src/infrastructure/asset-host/github.adapter.js';

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

const setup = ({ assetHost = makeFakeAssetHost() } = {}) => {
  // Uretimde kaydedici boot.js'te installLlmFromEnv({ recorder }) ile baglanir; testte ayni davranis:
  const llmCallRepo = makeLlmCallRepository({ rawQuery });
  const fake = makeFakeLlm({ recorder: (c) => llmCallRepo.insert(c) });
  const container = buildContainer({
    rawQueryFn: rawQuery,
    translateHttpErrors: false,
    llm: fake,
    llmConfigured: () => true,
    linkFetch: async () => new Response('', { status: 200 }),
    config: { qualityThreshold: 70, qualityMaxRounds: 2, judgeSamples: 3, topicSuggestedMax: 15, dailyCron: '0 6 * * *', timezone: 'UTC', thresholds: {} },
    ports: { research: makeFakeResearch(), renderer: makeFakeRenderer(), imageGenerator: makeFakeCoverGenerator(), assetHost },
  });
  return { container, fake };
};

const seedApprovedTopic = async (container) => {
  const theme = await container.useCases.theme.create({ caller: OPERATOR_CALLER, name: 'PostgreSQL', tags: 'postgres', targetAudience: 'backend developers', expertiseNotes: 'I ran vacuum tuning on a 2 TB table.' });
  return container.useCases.topic.create({ caller: OPERATOR_CALLER, themeCode: theme.themeCode, title: 'Why MVCC beats row locking for read-heavy workloads', angle: 'Readers should never block writers', keywords: 'postgres, mvcc', authorNote: 'We saw lock waits disappear after moving to MVCC-friendly queries.' });
};
const onlyArticle = async (container) => {
  const { items } = await container.useCases.article.list({ caller: OPERATOR_CALLER });
  expect(items).toHaveLength(1);
  return container.useCases.article.get({ caller: OPERATOR_CALLER, articleCode: items[0].articleCode });
};

describe('uçtan uca pipeline (sahte LLM + sahte portlar, gerçek DB)', () => {
  test('onaylı konu -> review: tüm aşamalar, diyagram + kapak gömülür, rapor dolu', async () => {
    const { container, fake } = setup();
    const topic = await seedApprovedTopic(container);
    const out = await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });
    expect(out).toMatchObject({ ok: true, topicCode: topic.topicCode });

    const detail = await onlyArticle(container);
    const a = detail.article;
    expect(a.articleStatus).toBe('review');
    expect(a.articlePipelineStage).toBe('final');
    expect(a.articleQualityReport.checks.items.filter((c) => !c.ok)).toEqual([]);
    expect(a.articleQualityScore).toBe(80); // sahte hakem 4/4/4/4
    expect(a.articleBodyMarkdown).not.toContain('{{DIAGRAM');
    expect(a.articleBodyMarkdown).not.toMatch(/```mermaid/);
    expect((a.articleBodyMarkdown.match(/!\[[^\]]*\]\(https:\/\/assets\.example\.test\/articles\//g) || []).length).toBe(2);
    expect(a.coverUrl).toMatch(/cover\.png$/);
    expect(a.articleQualityReport.checks.passed).toBe(true);
    expect(a.articleQualityReport.judge.samples).toBe(3);
    expect(a.articleQualityReport.assets).toMatchObject({ diagrams: 2, uploaded: 2, coverUploaded: true });

    expect(detail.assets.map((x) => [x.kind, x.status])).toEqual(expect.arrayContaining([['diagram', 'uploaded'], ['cover', 'uploaded']]));
    expect(detail.sources).toHaveLength(2);
    expect(detail.stages.map((s) => s.stage)).toEqual(['research', 'outline', 'draft', 'check', 'revise', 'score', 'assets', 'final']);
    expect(detail.llmUsage.map((u) => u.stage)).toEqual(expect.arrayContaining(['research-plan', 'research-facts', 'outline', 'section', 'editor', 'judge']));

    expect((await container.repos.topicRepo.findByCode({ topicCode: topic.topicCode })).topicStatus).toBe('used');

    // Yazar notu ve olgular bölüm prompt'larına girdi.
    const sectionCalls = fake.calls.filter((c) => c.stage === 'section');
    expect(sectionCalls.length).toBeGreaterThanOrEqual(7);
    expect(sectionCalls.every((c) => c.prompt.includes('We saw lock waits disappear'))).toBe(true);
    expect(sectionCalls.some((c) => c.prompt.includes('[F1]'))).toBe(true);
    // Yazım sırası: giriş EN SON.
    expect(/Section (\d+) of/.exec(sectionCalls.at(-1).prompt)[1]).toBe('1');
    // Hakem körü: önceki skor/rapor prompt'ta YOK.
    for (const c of fake.calls.filter((x) => x.stage === 'judge')) expect(c.prompt).not.toMatch(/qualityScore|rawScore|Weaknesses/);

    expect((await container.repos.jobRunRepo.latest({}))[0]).toMatchObject({ jobRunStatus: 'succeeded' });
  }, 60_000);

  const judgeAll = (n) => () => ({ technical_depth_reasoning: 'x', technical_depth: n, structural_richness_reasoning: 'x', structural_richness: n, clarity_reasoning: 'x', clarity: n, originality_reasoning: 'x', originality: n, strengths: ['s'], weaknesses: ['Claims are vague'] });
  const useImproveFakes = (fake, { afterScore }) => {
    fake.handlers.improve = () => ({ issues: [{ sectionHeading: 'Where it breaks', problem: 'The failure scenario is vague.', fix: 'Name the exact error.', severity: 'high' }] });
    fake.handlers['revise-section'] = (r) => `${r.meta.body}\n\nIMPROVED the failure now names the exact error and the broken behaviour.`;
    fake.handlers.judge = (r) => (r.prompt.includes('IMPROVED') ? judgeAll(afterScore)() : judgeAll(2)());
  };

  test('skor eşiğin altında: hakem eleştirisiyle bölüm yeniden yazılır, yeniden puanlanır ve daha iyi sürüm tutulur', async () => {
    const { container, fake } = setup();
    useImproveFakes(fake, { afterScore: 4 });
    await seedApprovedTopic(container);
    await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });

    const { article: a } = await onlyArticle(container);
    expect(a.articleQualityScore).toBe(80);
    expect(a.articleQualityReport.initialScore).toBe(40);
    expect(a.articleQualityReport.improveRounds).toEqual([expect.objectContaining({ round: 1, before: 40, after: 80, kept: true, changed: ['Where it breaks'] })]);
    expect(a.articleBodyMarkdown).toContain('IMPROVED');
    // Hakem eleştirisi yalnız 'improve' prompt'una gider; hakem kör kalır.
    expect(fake.calls.find((c) => c.stage === 'improve').prompt).toContain('Claims are vague');
    for (const c of fake.calls.filter((x) => x.stage === 'judge')) expect(c.prompt).not.toMatch(/Claims are vague|initialScore/);
  }, 60_000);

  test('yeniden yazım daha düşük puan alırsa bölümler eski haline döner ve döngü durur', async () => {
    const { container, fake } = setup();
    useImproveFakes(fake, { afterScore: 1 });
    await seedApprovedTopic(container);
    await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });

    const { article: a } = await onlyArticle(container);
    expect(a.articleQualityScore).toBe(40);
    expect(a.articleQualityReport.improveRounds).toEqual([expect.objectContaining({ round: 1, before: 40, after: 20, kept: false })]);
    expect(a.articleBodyMarkdown).not.toContain('IMPROVED');
    const sections = await container.repos.sectionRepo.list({ articleId: a.articleId });
    expect(sections.some((s) => s.body.includes('IMPROVED'))).toBe(false);
    expect(fake.calls.filter((c) => c.stage === 'improve')).toHaveLength(1);
  }, 60_000);

  test('panel butonu: otomatik iyileştirme çalışmamış makalede aktif, iyileştirme sonrası pasif', async () => {
    const { container, fake } = setup();
    fake.handlers.judge = judgeAll(2);
    await seedApprovedTopic(container);
    await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });
    let detail = await onlyArticle(container);
    expect(detail.improvable).toBe(false); // döngü çalıştı (düzeltilecek bölüm bulamadı) -> pasif
    await expect(container.useCases.pipeline.improveArticle({ caller: SYSTEM_CALLER, articleCode: detail.article.articleCode })).rejects.toMatchObject({ code: 'ARTICLE_NOT_IMPROVABLE' });

    // Eski kodla puanlanmış makaleyi taklit et: raporda improveRounds yok.
    const { improveRounds, initialScore, ...legacy } = detail.article.articleQualityReport;
    await container.repos.articleRepo.update({ articleId: detail.article.articleId, patch: { qualityReport: legacy } });
    detail = await onlyArticle(container);
    expect(detail.improvable).toBe(true);

    useImproveFakes(fake, { afterScore: 4 });
    const out = await container.useCases.pipeline.improveArticle({ caller: SYSTEM_CALLER, articleCode: detail.article.articleCode, wait: true });
    expect(out).toMatchObject({ ok: true });
    detail = await onlyArticle(container);
    expect(detail.article).toMatchObject({ articleStatus: 'review', articlePipelineStage: 'final', articleQualityScore: 80 });
    expect(detail.article.articleQualityReport.improveRounds).toEqual([expect.objectContaining({ before: 40, after: 80, kept: true })]);
    expect((detail.article.articleBodyMarkdown.match(/!\[[^\]]*\]\(https:\/\/assets\.example\.test\//g) || []).length).toBe(2); // görseller yeniden gömüldü
    expect(detail.improvable).toBe(false);
  }, 60_000);

  test('onaylı konu yoksa iş "skipped" kaydı düşer', async () => {
    const { container } = setup();
    expect(await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true })).toMatchObject({ ok: true, skipped: true });
    expect((await container.repos.jobRunRepo.latest({}))[0].jobRunStatus).toBe('skipped');
  });

  test('aşama hatası: makale failed olur, resume KALDIĞI AŞAMADAN devam eder (önceki aşamalar tekrarlanmaz)', async () => {
    const { container, fake } = setup();
    const goodJudge = fake.handlers.judge;
    fake.handlers.judge = () => {
      throw new Error('judge down');
    };
    await seedApprovedTopic(container);
    const first = await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });
    expect(first).toMatchObject({ ok: false, failedStage: 'score' });
    const failed = (await onlyArticle(container)).article;
    expect(failed).toMatchObject({ articleStatus: 'failed', articlePipelineStage: 'revise' });
    expect(failed.articleError).toMatch(/score: .*judge/);
    expect((await container.repos.jobRunRepo.latest({}))[0].jobRunStatus).toBe('failed');

    // Düzeldi: devam et.
    fake.handlers.judge = goodJudge;
    const callsBefore = fake.calls.length;
    const resumed = await container.useCases.pipeline.resumeArticle({ caller: SYSTEM_CALLER, articleCode: failed.articleCode, wait: true });
    expect(resumed).toMatchObject({ ok: true });
    const newStages = [...new Set(fake.calls.slice(callsBefore).map((c) => c.stage))];
    expect(newStages).not.toEqual(expect.arrayContaining(['research-plan', 'outline', 'section']));
    expect(newStages).toEqual(expect.arrayContaining(['judge']));
    const done = (await onlyArticle(container)).article;
    expect(done).toMatchObject({ articleStatus: 'review', articleQualityScore: 80, articleError: null });
  }, 60_000);

  test('asset yüklenemezse needs_assets; onaya izin yok; retryAssets review\'a çevirir', async () => {
    const flaky = makeFakeAssetHost();
    let down = true;
    const upload = flaky.upload;
    flaky.upload = async (args) => {
      if (down) throw new Error('GitHub 502');
      return upload(args);
    };
    const { container } = setup({ assetHost: flaky });
    await seedApprovedTopic(container);
    await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });
    let detail = await onlyArticle(container);
    expect(detail.article.articleStatus).toBe('needs_assets');
    expect(detail.assets.every((x) => x.status === 'failed')).toBe(true);
    expect(detail.article.articleBodyMarkdown).not.toContain('{{DIAGRAM'); // yer tutucu temizlendi (degrade)
    await expect(container.useCases.article.approve({ caller: OPERATOR_CALLER, articleCode: detail.article.articleCode })).rejects.toMatchObject({ code: 'ARTICLE_NEEDS_ASSETS' });

    down = false;
    const retried = await container.useCases.article.retryAssets({ caller: OPERATOR_CALLER, articleCode: detail.article.articleCode });
    expect(retried).toMatchObject({ status: 'review', uploaded: 2, coverUploaded: true });
    detail = await onlyArticle(container);
    expect(detail.article.articleStatus).toBe('review');
    expect((detail.article.articleBodyMarkdown.match(/!\[[^\]]*\]\(https:\/\/assets\.example\.test\//g) || []).length).toBe(2);
  }, 60_000);

  test('onay: eşiğin altında override ister; düzenleme onaylıyı review\'a döndürür; vazgeç konuyu geri alır', async () => {
    const { container, fake } = setup();
    fake.handlers.judge = () => ({ technical_depth_reasoning: 'x', technical_depth: 1, structural_richness_reasoning: 'x', structural_richness: 1, clarity_reasoning: 'x', clarity: 1, originality_reasoning: 'x', originality: 1, strengths: ['s'], weaknesses: ['w'] });
    const topic = await seedApprovedTopic(container);
    await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });
    const { article } = await onlyArticle(container);
    expect(article.articleQualityScore).toBe(20);
    await expect(container.useCases.article.approve({ caller: OPERATOR_CALLER, articleCode: article.articleCode })).rejects.toMatchObject({ code: 'ARTICLE_BELOW_THRESHOLD' });
    const approved = await container.useCases.article.approve({ caller: OPERATOR_CALLER, articleCode: article.articleCode, override: true });
    expect(approved.articleStatus).toBe('approved');
    const edited = await container.useCases.article.update({ caller: OPERATOR_CALLER, articleCode: article.articleCode, title: 'New title', tags: 'A B, c' });
    expect(edited).toMatchObject({ articleStatus: 'review', articleTitle: 'New title', articleTags: ['ab', 'c'] });

    const gone = await container.useCases.article.abandon({ caller: OPERATOR_CALLER, articleCode: article.articleCode, rewrite: true });
    expect(gone).toMatchObject({ topicCode: topic.topicCode, topicStatus: 'approved' });
    expect((await container.useCases.article.list({ caller: OPERATOR_CALLER })).items).toHaveLength(0);
  }, 60_000);

  test('LLM yapılandırılmamışsa iş LLM_NOT_CONFIGURED ile reddedilir', async () => {
    const fake = makeFakeLlm();
    const container = buildContainer({ rawQueryFn: rawQuery, translateHttpErrors: false, llm: fake, llmConfigured: () => false, ports: { research: makeFakeResearch(), renderer: makeFakeRenderer(), imageGenerator: makeFakeCoverGenerator(), assetHost: makeFakeAssetHost() } });
    await expect(container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER })).rejects.toMatchObject({ code: 'LLM_NOT_CONFIGURED' });
  });
});
