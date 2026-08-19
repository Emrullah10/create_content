import http from '@shared/axios/http';

export const publishArticle = async (articleId) => (await http.post(`/articles/${articleId}/publish`)).data;
export const retryPublications = async () => (await http.post('/publications/retry')).data;
