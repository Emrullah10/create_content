import 'app-config'; // env'i (development'ta kokteki .env) container kurulmadan ONCE yukler
import { rawQuery } from 'app-shared';
import { readContentConfig } from './config.js';
import { wrapWithHttpTranslation } from './interfaces/http/translate-domain-error.js';
import { llm as llmPort, isLlmConfigured, describeLlm } from './infrastructure/llm/llm-port.js';
import { loadPrompt } from './infrastructure/llm/prompt-loader.js';
import { lazyPort, describePorts } from './infrastructure/ports.js';
import { makeCronLockForContainer } from './infrastructure/cron-lock-adapter.js';
import { checkMarkdownCode } from './infrastructure/code-check/code-checker.js';
import { makeLinkChecker } from './infrastructure/code-check/link-checker.js';
import { makeThemeRepository } from './infrastructure/persistence/repositories/theme.repository.js';
import { makeTopicRepository } from './infrastructure/persistence/repositories/topic.repository.js';
import { makeArticleRepository } from './infrastructure/persistence/repositories/article.repository.js';
import { makeSectionRepository } from './infrastructure/persistence/repositories/section.repository.js';
import { makeRevisionRepository } from './infrastructure/persistence/repositories/revision.repository.js';
import { makeResearchSourceRepository } from './infrastructure/persistence/repositories/research-source.repository.js';
import { makeAssetRepository } from './infrastructure/persistence/repositories/asset.repository.js';
import { makePublicationRepository } from './infrastructure/persistence/repositories/publication.repository.js';
import { makeJobRunRepository } from './infrastructure/persistence/repositories/job-run.repository.js';
import { makeLlmCallRepository } from './infrastructure/persistence/repositories/llm-call.repository.js';
import { makeCreateTheme } from './application/use-cases/theme/create-theme.use-case.js';
import { makeUpdateTheme } from './application/use-cases/theme/update-theme.use-case.js';
import { makeToggleTheme } from './application/use-cases/theme/toggle-theme.use-case.js';
import { makeGenerateTopics } from './application/use-cases/topic/generate-topics.use-case.js';
import { makeCreateTopic, makeApproveTopic, makeRejectTopic, makeUpdateTopic, makeListTopics } from './application/use-cases/topic/topic-actions.use-case.js';
import { makeResearchArticle } from './application/use-cases/pipeline/research-article.use-case.js';
import { makeOutlineArticle } from './application/use-cases/pipeline/outline-article.use-case.js';
import { makeDraftSections } from './application/use-cases/pipeline/draft-sections.use-case.js';
import { makeCheckArticle } from './application/use-cases/pipeline/check-article.use-case.js';
import { makeEditArticle } from './application/use-cases/pipeline/edit-article.use-case.js';
import { makeScoreArticle } from './application/use-cases/pipeline/score-article.use-case.js';
import { makePrepareAssets } from './application/use-cases/pipeline/prepare-assets.use-case.js';
import { makeFinalizeArticle } from './application/use-cases/pipeline/finalize-article.use-case.js';
import { makeArticlePipeline } from './application/orchestrators/article-pipeline.orchestrator.js';
import { makeRunPipelineJob } from './application/use-cases/job/run-pipeline-job.use-case.js';
import { makeGetDashboard } from './application/use-cases/job/get-dashboard.use-case.js';
import { makePublishToDevto } from './application/use-cases/publication/publish-to-devto.use-case.js';
import { makeListPublications, makeConfirmMediumImport, makeRetryPublications } from './application/use-cases/publication/publication-actions.use-case.js';
import { makeListArticles, makeGetArticle, makeUpdateArticle, makeApproveArticle, makeRetryAssets, makeAbandonArticle } from './application/use-cases/article/article-actions.use-case.js';

// Composition root: DI kutuphanesi yok, her use-case bir make<Eylem>(deps) fabrikasi.
// ⚠️ Her use-case DONDURULMUS haritada olmak zorundadir; yalniz *Raw'a eklenen fonksiyon handler/cron'dan cagrildiginda
// "is not a function" verir (container-wiring testi bunu kilitler).
const freezeGroup = (raw, wrap) => Object.freeze({ ...Object.fromEntries(Object.entries(raw).map(([k, fn]) => [k, wrap(fn)])), raw });

export const buildContainer = ({ rawQueryFn = rawQuery, translateHttpErrors = true, nowFn, ports, config = readContentConfig(), llm = llmPort, llmConfigured = isLlmConfigured, linkFetch } = {}) => {
  const repos = {
    themeRepo: makeThemeRepository({ rawQuery: rawQueryFn }),
    topicRepo: makeTopicRepository({ rawQuery: rawQueryFn }),
    articleRepo: makeArticleRepository({ rawQuery: rawQueryFn }),
    sectionRepo: makeSectionRepository({ rawQuery: rawQueryFn }),
    revisionRepo: makeRevisionRepository({ rawQuery: rawQueryFn }),
    sourceRepo: makeResearchSourceRepository({ rawQuery: rawQueryFn }),
    assetRepo: makeAssetRepository({ rawQuery: rawQueryFn }),
    publicationRepo: makePublicationRepository({ rawQuery: rawQueryFn }),
    jobRunRepo: makeJobRunRepository({ rawQuery: rawQueryFn }),
    llmCallRepo: makeLlmCallRepository({ rawQuery: rawQueryFn }),
  };
  const wrap = translateHttpErrors ? wrapWithHttpTranslation : (fn) => fn;
  // Eksik portlar tembel varsayilana duser: yalniz KULLANILDIGINDA PORT_NOT_CONFIGURED verir (testler kismi port seti verebilir).
  const p = {
    research: lazyPort('research', ['gather']),
    renderer: lazyPort('renderer', ['validateMermaid', 'renderMermaidToPng']),
    imageGenerator: lazyPort('imageGenerator', ['generateCover']),
    assetHost: lazyPort('assetHost', ['upload']),
    devto: lazyPort('devto', ['create', 'update', 'findByTitle']),
    ...ports,
  };
  const systemPrompt = loadPrompt('system-writer');
  const linkChecker = makeLinkChecker({ fetchImpl: linkFetch });
  const withLock = makeCronLockForContainer();
  const deps = { rawQuery: rawQueryFn, llm, systemPrompt, ...repos, ...(nowFn ? { nowFn } : {}) };

  // --- pipeline asamalari (ham) ---
  const stagesRaw = {
    research: makeResearchArticle({ ...deps, gather: (plan) => p.research.gather(plan) }),
    outline: makeOutlineArticle(deps),
    draft: makeDraftSections(deps),
    check: makeCheckArticle({ ...deps, checkCode: checkMarkdownCode, linkChecker, thresholds: config.thresholds }),
    editor: makeEditArticle({ ...deps, checkCode: checkMarkdownCode, thresholds: config.thresholds, maxRounds: config.qualityMaxRounds }),
    score: makeScoreArticle({ ...deps, samples: config.judgeSamples }),
    assets: makePrepareAssets({ ...deps, renderer: p.renderer, imageGenerator: p.imageGenerator, assetHost: p.assetHost }),
    final: makeFinalizeArticle(deps),
  };
  const pipeline = makeArticlePipeline({ stages: stagesRaw, articleRepo: repos.articleRepo });
  const jobs = makeRunPipelineJob({ pipeline, topicRepo: repos.topicRepo, articleRepo: repos.articleRepo, jobRunRepo: repos.jobRunRepo, withLock, isLlmConfigured: llmConfigured });

  const themeRaw = { create: makeCreateTheme(deps), update: makeUpdateTheme(deps), toggle: makeToggleTheme(deps) };
  const topicRaw = {
    generate: makeGenerateTopics({ ...deps, suggestedMax: config.topicSuggestedMax }),
    create: makeCreateTopic(deps),
    approve: makeApproveTopic(deps),
    reject: makeRejectTopic(deps),
    update: makeUpdateTopic(deps),
    list: makeListTopics(deps),
  };
  const articleRaw = {
    list: makeListArticles(deps),
    get: makeGetArticle(deps),
    update: makeUpdateArticle(deps),
    approve: makeApproveArticle({ ...deps, qualityThreshold: config.qualityThreshold }),
    retryAssets: makeRetryAssets({ ...deps, prepareAssets: stagesRaw.assets, finalizeArticle: stagesRaw.final }),
    abandon: makeAbandonArticle(deps),
  };
  const publishToDevto = makePublishToDevto({ ...deps, devto: p.devto, defaultMode: config.devtoPublishMode });
  const publicationRaw = {
    publishToDevto,
    confirmMediumImport: makeConfirmMediumImport(deps),
    list: makeListPublications(deps),
    retryFailed: makeRetryPublications({ ...deps, publish: publishToDevto }),
  };
  const pipelineRaw = {
    runDaily: jobs.runDaily,
    resumeArticle: jobs.resumeArticle,
    dashboard: makeGetDashboard({ ...deps, describeLlm, isLlmConfigured: llmConfigured, describePorts, config }),
  };

  const useCases = Object.freeze({
    theme: freezeGroup(themeRaw, wrap),
    topic: freezeGroup(topicRaw, wrap),
    article: freezeGroup(articleRaw, wrap),
    publication: freezeGroup(publicationRaw, wrap),
    pipeline: freezeGroup(pipelineRaw, wrap),
    stages: freezeGroup(stagesRaw, wrap),
  });
  return Object.freeze({ repos, useCases, config, pipeline });
};

const container = buildContainer();
export default container;
