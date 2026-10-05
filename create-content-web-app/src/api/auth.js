import http, { unwrap } from '@shared/axios/axios';

export default {
  getAuthSession: () => http.get('/auth/session').then(unwrap),
  login: (password) => http.post('/auth/login', { password }).then(unwrap),
  logout: () => http.post('/auth/logout').then(unwrap),
};
