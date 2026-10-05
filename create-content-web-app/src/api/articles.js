import http, { unwrap } from '@shared/axios/axios';

export default {
  listArticles: (params) => http.get('/v1/articles/list', { params }).then(unwrap),
  getArticleDetail: (code) => http.get(`/v1/articles/${code}/detail`).then(unwrap),
  updateArticle: (code, body) => http.post(`/v1/articles/${code}/update`, body).then(unwrap),
  approveArticle: (code, override = false) => http.post(`/v1/articles/${code}/approve`, { override }).then(unwrap),
  retryArticleAssets: (code) => http.post(`/v1/articles/${code}/retry-assets`).then(unwrap),
  abandonArticle: (code, rewrite = false) => http.post(`/v1/articles/${code}/abandon`, { rewrite }).then(unwrap),
  resumeArticle: (code) => http.post(`/v1/pipeline/articles/${code}/resume`).then(unwrap),
};
