import http from '@shared/axios/http';

export const runDailyContentJob = async () => (await http.post('/jobs/daily-content/run')).data;
