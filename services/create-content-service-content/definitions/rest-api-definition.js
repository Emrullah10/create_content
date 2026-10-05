import coreDefinition from '../../../core/service-content/definitions/rest-api-definition.js';
import { PERMISSIONS, requirePermission, requireInternal } from 'app-shared';

// `x-functionName` degerleri routes/rest-routes.js anahtarlariyla BIREBIR ayni olmali;
// uyusmazsa route-binder acilista hata verir (eksik handler).
const queryParam = { in: 'query', name: 'queryParams', schema: { $ref: '#/components/schemas/QueryParameters' } };
const pathParam = (name) => ({ in: 'path', name, required: true, schema: { type: 'string' } });
const okResponse = {
  200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/apiResponse' } } } },
};
const jsonBody = (ref, { required = true } = {}) => ({
  required,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } },
});

const op = ({
  summary,
  functionName,
  tag,
  method = 'post',
  permission, // PERMISSIONS.x | '*' | 'a:read,b:read' (herhangi biri)
  internal = false,
  requestBodyRef,
  requestRequired = true,
  pathParams = [],
  query = false,
}) => ({
  [method]: {
    summary,
    'x-functionName': functionName,
    tags: [tag],
    ...(internal ? requireInternal() : {}),
    ...(permission ? requirePermission(permission) : {}),
    ...(requestBodyRef ? { requestBody: jsonBody(requestBodyRef, { required: requestRequired }) } : {}),
    parameters: [...pathParams, ...(query ? [queryParam] : [])],
    responses: okResponse,
  },
});

const schemas = {
  apiResponse: {
    type: 'object',
    properties: { success: { type: 'boolean' }, data: {}, error: { type: 'object' } },
  },
  themeCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', maxLength: 200 },
      description: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      targetAudience: { type: 'string', maxLength: 300 },
      expertiseNotes: { type: 'string' },
      weight: { type: 'integer', minimum: 1, maximum: 10 },
    },
  },
  themeUpdateRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', maxLength: 200 },
      description: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      targetAudience: { type: 'string', maxLength: 300 },
      expertiseNotes: { type: 'string' },
      weight: { type: 'integer', minimum: 1, maximum: 10 },
      isActive: { type: 'boolean' },
    },
  },
  themeToggleRequest: {
    type: 'object',
    required: ['isActive'],
    properties: { isActive: { type: 'boolean' } },
  },
  topicGenerateRequest: {
    type: 'object',
    required: ['themeCode'],
    properties: { themeCode: { type: 'string' }, count: { type: 'integer', minimum: 1, maximum: 20 } },
  },
  topicCreateRequest: {
    type: 'object',
    required: ['themeCode', 'title'],
    properties: {
      themeCode: { type: 'string' },
      title: { type: 'string', maxLength: 300 },
      angle: { type: 'string' },
      keywords: { type: 'array', items: { type: 'string' } },
      authorNote: { type: 'string' },
      status: { type: 'string', enum: ['approved', 'suggested'] },
    },
  },
  topicUpdateRequest: {
    type: 'object',
    properties: { title: { type: 'string', maxLength: 300 }, angle: { type: 'string' }, keywords: { type: 'array', items: { type: 'string' } }, authorNote: { type: 'string' } },
  },
  topicApproveRequest: { type: 'object', properties: { authorNote: { type: 'string' } } },
  articleUpdateRequest: {
    type: 'object',
    properties: { title: { type: 'string' }, subtitle: { type: 'string' }, summary: { type: 'string' }, bodyMarkdown: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } },
  },
  articleApproveRequest: { type: 'object', properties: { override: { type: 'boolean' } } },
  articleAbandonRequest: { type: 'object', properties: { rewrite: { type: 'boolean' } } },
  publishRequest: { type: 'object', properties: { mode: { type: 'string', enum: ['draft', 'live'] } } },
  mediumConfirmRequest: { type: 'object', required: ['mediumUrl'], properties: { mediumUrl: { type: 'string' } } },
  pipelineRunRequest: { type: 'object', properties: { topicCode: { type: 'string' } } },
};

const customPaths = {
  '/v1/themes/create': op({
    summary: 'Create a theme',
    functionName: 'postThemeCreate',
    tag: 'Theme',
    permission: PERMISSIONS.contentManage,
    requestBodyRef: 'themeCreateRequest',
  }),
  '/v1/themes/{themeCode}/update': op({
    summary: 'Update a theme',
    functionName: 'postThemeUpdate',
    tag: 'Theme',
    permission: PERMISSIONS.contentManage,
    requestBodyRef: 'themeUpdateRequest',
    pathParams: [pathParam('themeCode')],
  }),
  '/v1/themes/{themeCode}/toggle': op({
    summary: 'Activate or deactivate a theme',
    functionName: 'postThemeToggle',
    tag: 'Theme',
    permission: PERMISSIONS.contentManage,
    requestBodyRef: 'themeToggleRequest',
    pathParams: [pathParam('themeCode')],
  }),
};

const articleCode = pathParam('articleCode');
const topicCode = pathParam('topicCode');
Object.assign(customPaths, {
  '/v1/dashboard': op({ summary: 'Dashboard: counts, recent jobs, active models', functionName: 'getDashboard', tag: 'Pipeline', method: 'get', permission: PERMISSIONS.contentRead }),
  '/v1/topics/list': op({ summary: 'Topics with theme, filterable by status/theme', functionName: 'getTopicsList', tag: 'Topic', method: 'get', permission: PERMISSIONS.contentRead }),
  '/v1/topics/generate': op({ summary: 'Suggest topics for a theme with the LLM', functionName: 'postTopicGenerate', tag: 'Topic', permission: PERMISSIONS.contentManage, requestBodyRef: 'topicGenerateRequest' }),
  '/v1/topics/create': op({ summary: 'Add a topic manually', functionName: 'postTopicCreate', tag: 'Topic', permission: PERMISSIONS.contentManage, requestBodyRef: 'topicCreateRequest' }),
  '/v1/topics/{topicCode}/update': op({ summary: 'Edit a topic', functionName: 'postTopicUpdate', tag: 'Topic', permission: PERMISSIONS.contentManage, requestBodyRef: 'topicUpdateRequest', pathParams: [topicCode] }),
  '/v1/topics/{topicCode}/approve': op({ summary: 'Approve a topic (optionally with an author note)', functionName: 'postTopicApprove', tag: 'Topic', permission: PERMISSIONS.contentManage, requestBodyRef: 'topicApproveRequest', requestRequired: false, pathParams: [topicCode] }),
  '/v1/topics/{topicCode}/reject': op({ summary: 'Reject a topic', functionName: 'postTopicReject', tag: 'Topic', permission: PERMISSIONS.contentManage, pathParams: [topicCode] }),
  '/v1/articles/list': op({ summary: 'Articles with counts by status', functionName: 'getArticlesList', tag: 'Article', method: 'get', permission: PERMISSIONS.contentRead }),
  '/v1/articles/{articleCode}/detail': op({ summary: 'Article detail: body, report, sources, assets, publications, LLM usage', functionName: 'getArticleDetail', tag: 'Article', method: 'get', permission: PERMISSIONS.contentRead, pathParams: [articleCode] }),
  '/v1/articles/{articleCode}/update': op({ summary: 'Edit an article', functionName: 'postArticleUpdate', tag: 'Article', permission: PERMISSIONS.contentManage, requestBodyRef: 'articleUpdateRequest', pathParams: [articleCode] }),
  '/v1/articles/{articleCode}/approve': op({ summary: 'Approve an article for publishing', functionName: 'postArticleApprove', tag: 'Article', permission: PERMISSIONS.contentPublish, requestBodyRef: 'articleApproveRequest', requestRequired: false, pathParams: [articleCode] }),
  '/v1/articles/{articleCode}/retry-assets': op({ summary: 'Retry failed diagrams/cover', functionName: 'postArticleRetryAssets', tag: 'Article', permission: PERMISSIONS.contentRun, pathParams: [articleCode] }),
  '/v1/articles/{articleCode}/abandon': op({ summary: 'Discard an article (topic returns to the queue or is rejected)', functionName: 'postArticleAbandon', tag: 'Article', permission: PERMISSIONS.contentManage, requestBodyRef: 'articleAbandonRequest', requestRequired: false, pathParams: [articleCode] }),
  '/v1/publications/list': op({ summary: 'Publications per platform', functionName: 'getPublicationsList', tag: 'Publication', method: 'get', permission: PERMISSIONS.contentRead }),
  '/v1/articles/{articleCode}/publish-devto': op({ summary: 'Publish an approved article to dev.to (draft or live), idempotent', functionName: 'postArticlePublishDevto', tag: 'Publication', permission: PERMISSIONS.contentPublish, requestBodyRef: 'publishRequest', requestRequired: false, pathParams: [articleCode] }),
  '/v1/articles/{articleCode}/medium-import': op({ summary: 'Record the Medium URL after importing the live dev.to post', functionName: 'postArticleMediumImport', tag: 'Publication', permission: PERMISSIONS.contentPublish, requestBodyRef: 'mediumConfirmRequest', pathParams: [articleCode] }),
  '/v1/publications/retry': op({ summary: 'Retry failed dev.to publications now', functionName: 'postPublicationsRetry', tag: 'Publication', permission: PERMISSIONS.contentPublish }),
  '/v1/pipeline/run': op({ summary: 'Write the next (or a given) approved topic now, in the background', functionName: 'postPipelineRun', tag: 'Pipeline', permission: PERMISSIONS.contentRun, requestBodyRef: 'pipelineRunRequest', requestRequired: false }),
  '/v1/pipeline/articles/{articleCode}/resume': op({ summary: 'Resume a failed article from the stage where it stopped', functionName: 'postPipelineResume', tag: 'Pipeline', permission: PERMISSIONS.contentRun, pathParams: [articleCode] }),
});

export default {
  ...coreDefinition,
  components: {
    ...(coreDefinition.components || {}),
    schemas: { ...(coreDefinition.components?.schemas || {}), ...schemas },
  },
  paths: { ...(coreDefinition.paths || {}), ...customPaths },
};
