import { wrap } from 'app-shared';
import coreRoutes from '../../../core/service-content/routes/rest-routes.js';
import * as h from '../src/interfaces/http/index.js';

// Anahtarlar = OpenAPI `x-functionName`.
export default {
  ...coreRoutes,
  postThemeCreate: wrap(h.themeCreateHandler, { successStatus: 201 }),
  postThemeUpdate: wrap(h.themeUpdateHandler),
  postThemeToggle: wrap(h.themeToggleHandler),
  getDashboard: wrap(h.dashboardHandler),
  getTopicsList: wrap(h.topicListHandler),
  postTopicGenerate: wrap(h.topicGenerateHandler),
  postTopicCreate: wrap(h.topicCreateHandler, { successStatus: 201 }),
  postTopicUpdate: wrap(h.topicUpdateHandler),
  postTopicApprove: wrap(h.topicApproveHandler),
  postTopicReject: wrap(h.topicRejectHandler),
  getArticlesList: wrap(h.articleListHandler),
  getArticleDetail: wrap(h.articleGetHandler),
  postArticleUpdate: wrap(h.articleUpdateHandler),
  postArticleApprove: wrap(h.articleApproveHandler),
  postArticleRetryAssets: wrap(h.articleRetryAssetsHandler),
  postArticleAbandon: wrap(h.articleAbandonHandler),
  postPipelineRun: wrap(h.pipelineRunHandler),
  postPipelineResume: wrap(h.pipelineResumeHandler),
};
