import http, { unwrap } from '@shared/axios/axios';

export default {
  listPublications: () => http.get('/v1/publications/list').then(unwrap),
  publishToDevto: (code, mode) => http.post(`/v1/articles/${code}/publish-devto`, { mode }).then(unwrap),
  confirmMediumImport: (code, mediumUrl) => http.post(`/v1/articles/${code}/medium-import`, { mediumUrl }).then(unwrap),
  retryPublications: () => http.post('/v1/publications/retry').then(unwrap),
};
