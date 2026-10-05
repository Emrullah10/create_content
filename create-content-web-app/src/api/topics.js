import http, { unwrap } from '@shared/axios/axios';

export default {
  listTopics: (params) => http.get('/v1/topics/list', { params }).then(unwrap),
  generateTopics: (body) => http.post('/v1/topics/generate', body).then(unwrap),
  createTopic: (body) => http.post('/v1/topics/create', body).then(unwrap),
  updateTopic: (topicCode, body) => http.post(`/v1/topics/${topicCode}/update`, body).then(unwrap),
  approveTopic: (topicCode, authorNote) => http.post(`/v1/topics/${topicCode}/approve`, { authorNote }).then(unwrap),
  rejectTopic: (topicCode) => http.post(`/v1/topics/${topicCode}/reject`).then(unwrap),
};
