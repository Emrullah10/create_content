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

export default {
  ...coreDefinition,
  components: {
    ...(coreDefinition.components || {}),
    schemas: { ...(coreDefinition.components?.schemas || {}), ...schemas },
  },
  paths: { ...(coreDefinition.paths || {}), ...customPaths },
};
