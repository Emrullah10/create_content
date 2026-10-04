import http from '@shared/axios/http';

export const listArticles = async (status) => (await http.get('/articles', { params: { status } })).data;
export const getArticle = async (id) => (await http.get(`/articles/${id}`)).data;
export const updateArticle = async (id, patch) => (await http.patch(`/articles/${id}`, patch)).data;
export const approveArticle = async (id) => (await http.patch(`/articles/${id}/approve`)).data;
