import http, { unwrap } from '@shared/axios/axios';

export default {
  getDashboard: () => http.get('/v1/dashboard').then(unwrap),
  runPipelineNow: (topicCode) => http.post('/v1/pipeline/run', topicCode ? { topicCode } : {}).then(unwrap),
};
