import http from '@shared/axios/http';

export const generateTopics = async (themeId, count = 20) => (await http.post('/topics/generate', { themeId, count })).data;
export const approveTopic = async (id) => (await http.patch(`/topics/${id}/approve`)).data;
export const rejectTopic = async (id) => (await http.patch(`/topics/${id}/reject`)).data;
