// Composition root: tum use-case'ler burada elle "wire" edilir.
// Class/DI kutuphanesi yok — her bagimlilik acikca gorulebilir (bkz MONOREPO-ARCHITECTURE-TEMPLATE.md Bolum 3.2).
import datasource from '@create-content/datasource';
import { aiConfig, publisherConfig, assetHostConfig, contentConfig } from '@create-content/config';

import { makeThemeRepository } from '@create-content/core-service-content/src/infrastructure/persistence/repositories/theme.repository.js';
import { makeTopicRepository } from '@create-content/core-service-content/src/infrastructure/persistence/repositories/topic.repository.js';
import { makeArticleRepository } from '@create-content/core-service-content/src/infrastructure/persistence/repositories/article.repository.js';
import { makeArticleRevisionRepository } from '@create-content/core-service-content/src/infrastructure/persistence/repositories/article-revision.repository.js';
import { makeAssetRepository } from '@create-content/core-service-content/src/infrastructure/persistence/repositories/asset.repository.js';
import { makePublicationRepository } from '@create-content/core-service-content/src/infrastructure/persistence/repositories/publication.repository.js';
import { makeJobRunRepository } from '@create-content/core-service-content/src/infrastructure/persistence/repositories/job-run.repository.js';

import { makeAiClient } from '@create-content/core-service-content/src/infrastructure/ai/ai-client.js';
import { makeMermaidRenderer } from '@create-content/core-service-content/src/infrastructure/renderer/mermaid-renderer.js';
import { makeGithubAssetHost } from '@create-content/core-service-content/src/infrastructure/image-host/github-asset-host.js';
import { makeDevtoPublisher } from '@create-content/core-service-content/src/infrastructure/publishers/devto.publisher.js';
import { makeMediumApiPublisher } from '@create-content/core-service-content/src/infrastructure/publishers/medium-api.publisher.js';
import { makeMediumImportPublisher } from '@create-content/core-service-content/src/infrastructure/publishers/medium-import.publisher.js';

import { makeCreateTheme } from '@create-content/core-service-content/src/application/use-cases/theme/create-theme.use-case.js';
import { makeListThemes } from '@create-content/core-service-content/src/application/use-cases/theme/list-themes.use-case.js';
import { makeToggleTheme } from '@create-content/core-service-content/src/application/use-cases/theme/toggle-theme.use-case.js';
import { makeUpdateTheme } from '@create-content/core-service-content/src/application/use-cases/theme/update-theme.use-case.js';

import { makeGenerateTopics } from '@create-content/core-service-content/src/application/use-cases/topic/generate-topics.use-case.js';
import { makeApproveTopic } from '@create-content/core-service-content/src/application/use-cases/topic/approve-topic.use-case.js';
import { makeRejectTopic } from '@create-content/core-service-content/src/application/use-cases/topic/reject-topic.use-case.js';
import { makePickNextTopic } from '@create-content/core-service-content/src/application/use-cases/topic/pick-next-topic.use-case.js';

import { makeDraftArticle } from '@create-content/core-service-content/src/application/use-cases/article/draft-article.use-case.js';
import { makeCritiqueAndRevise } from '@create-content/core-service-content/src/application/use-cases/article/critique-and-revise.use-case.js';
import { makeScoreArticle } from '@create-content/core-service-content/src/application/use-cases/article/score-article.use-case.js';
import { makeUpdateArticle } from '@create-content/core-service-content/src/application/use-cases/article/update-article.use-case.js';
import { makeApproveArticle } from '@create-content/core-service-content/src/application/use-cases/article/approve-article.use-case.js';
import { makeGetArticle, makeListArticles } from '@create-content/core-service-content/src/application/use-cases/article/get-article.use-case.js';

import { makeRenderDiagrams } from '@create-content/core-service-content/src/application/use-cases/asset/render-diagrams.use-case.js';
import { makeGenerateCover } from '@create-content/core-service-content/src/application/use-cases/asset/generate-cover.use-case.js';
import { makeUploadAssets } from '@create-content/core-service-content/src/application/use-cases/asset/upload-assets.use-case.js';
import { makeEmbedAssets } from '@create-content/core-service-content/src/application/use-cases/asset/embed-assets.use-case.js';

import { makePublishToDevto } from '@create-content/core-service-content/src/application/use-cases/publication/publish-to-devto.use-case.js';
import { makeCrosspostToMedium } from '@create-content/core-service-content/src/application/use-cases/publication/crosspost-to-medium.use-case.js';
import { makeRetryPublication } from '@create-content/core-service-content/src/application/use-cases/publication/retry-publication.use-case.js';

import { makeDailyContentOrchestrator } from '@create-content/core-service-content/src/application/orchestrators/daily-content.orchestrator.js';
import { makePublishOrchestrator } from '@create-content/core-service-content/src/application/orchestrators/publish.orchestrator.js';

import { loadMermaidSource } from './shared/mermaid-js-source.js';

export const buildContainer = ({
  rawQueryFn = datasource.query,
  aiClient: aiClientOverride,
  devtoPublisher: devtoOverride,
  mediumApiPublisher: mediumApiOverride,
  mediumImportPublisher: mediumImportOverride,
  imageHost: imageHostOverride,
  renderer: rendererOverride,
} = {}) => {
  const repos = {
    themeRepo: makeThemeRepository({ rawQuery: rawQueryFn }),
    topicRepo: makeTopicRepository({ rawQuery: rawQueryFn }),
    articleRepo: makeArticleRepository({ rawQuery: rawQueryFn }),
    revisionRepo: makeArticleRevisionRepository({ rawQuery: rawQueryFn }),
    assetRepo: makeAssetRepository({ rawQuery: rawQueryFn }),
    publicationRepo: makePublicationRepository({ rawQuery: rawQueryFn }),
    jobRunRepo: makeJobRunRepository({ rawQuery: rawQueryFn }),
  };

  const aiClient = aiClientOverride ?? makeAiClient({ baseUrl: aiConfig.apiUrl });
  const renderer = rendererOverride ?? makeMermaidRenderer({ mermaidJsSource: loadMermaidSource() });
  const imageHost = imageHostOverride ?? makeGithubAssetHost({
    token: assetHostConfig.githubToken,
    repo: assetHostConfig.githubRepo,
    branch: assetHostConfig.githubBranch,
  });

  const devtoPublisher = devtoOverride ?? makeDevtoPublisher({
    apiKey: publisherConfig.devtoApiKey,
    publishMode: publisherConfig.devtoPublishMode,
  });
  const mediumApiPublisher = mediumApiOverride ?? makeMediumApiPublisher({ token: publisherConfig.mediumToken });
  const mediumImportPublisher = mediumImportOverride ?? makeMediumImportPublisher();

  const themeUseCases = {
    createTheme: makeCreateTheme(repos),
    listThemes: makeListThemes(repos),
    toggleTheme: makeToggleTheme(repos),
    updateTheme: makeUpdateTheme(repos),
  };

  const topicUseCases = {
    generateTopics: makeGenerateTopics({ ...repos, aiClient }),
    approveTopic: makeApproveTopic(repos),
    rejectTopic: makeRejectTopic(repos),
    pickNextTopic: makePickNextTopic(repos),
  };

  const articleUseCases = {
    draftArticle: makeDraftArticle({ ...repos, aiClient }),
    critiqueAndRevise: makeCritiqueAndRevise({ ...repos, aiClient }),
    scoreArticle: makeScoreArticle({ ...repos, aiClient }),
    updateArticle: makeUpdateArticle(repos),
    approveArticle: makeApproveArticle(repos),
    getArticle: makeGetArticle(repos),
    listArticles: makeListArticles(repos),
  };

  const assetUseCases = {
    renderDiagrams: makeRenderDiagrams({ ...repos, renderer }),
    generateCover: makeGenerateCover({ ...repos, aiClient }),
    uploadAssets: makeUploadAssets({ ...repos, imageHost }),
    embedAssets: makeEmbedAssets(repos),
  };

  const publicationUseCases = {
    publishToDevto: makePublishToDevto({ ...repos, devtoPublisher }),
    crosspostToMedium: makeCrosspostToMedium({ ...repos, mediumApiPublisher, mediumImportPublisher }),
    retryPublication: makeRetryPublication({
      publicationRepo: repos.publicationRepo,
      publishers: { devto: devtoPublisher, medium: mediumApiPublisher },
    }),
  };

  const dailyContentOrchestrator = makeDailyContentOrchestrator({
    pickNextTopic: topicUseCases.pickNextTopic,
    draftArticle: articleUseCases.draftArticle,
    critiqueAndRevise: articleUseCases.critiqueAndRevise,
    renderDiagrams: assetUseCases.renderDiagrams,
    generateCover: assetUseCases.generateCover,
    uploadAssets: assetUseCases.uploadAssets,
    embedAssets: assetUseCases.embedAssets,
    scoreArticle: articleUseCases.scoreArticle,
    topicRepo: repos.topicRepo,
  });

  const publishOrchestrator = makePublishOrchestrator({
    articleRepo: repos.articleRepo,
    publishToDevto: publicationUseCases.publishToDevto,
    crosspostToMedium: publicationUseCases.crosspostToMedium,
  });

  return {
    repos,
    aiClient,
    ...themeUseCases,
    ...topicUseCases,
    ...articleUseCases,
    ...assetUseCases,
    ...publicationUseCases,
    dailyContentOrchestrator,
    publishOrchestrator,
    contentConfig,
  };
};
