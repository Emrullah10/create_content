import coreControllers from '../../../../../core/service-content/src/interfaces/http/index.js';

export { themeCreateHandler, themeUpdateHandler, themeToggleHandler } from './theme.js';
export { topicListHandler, topicGenerateHandler, topicCreateHandler, topicUpdateHandler, topicApproveHandler, topicRejectHandler } from './topic.js';
export { articleListHandler, articleGetHandler, articleUpdateHandler, articleApproveHandler, articleRetryAssetsHandler, articleAbandonHandler } from './article.js';
export { pipelineRunHandler, pipelineResumeHandler, dashboardHandler } from './pipeline.js';
export { publicationListHandler, publishToDevtoHandler, confirmMediumImportHandler, retryPublicationsHandler } from './publication.js';

export default { ...coreControllers };
