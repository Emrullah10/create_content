import http, { unwrap } from '@shared/axios/axios';

export default {
  listThemes: () => http.get('/v1/themes').then(unwrap), // auto-CRUD: ham dizi
  createTheme: (body) => http.post('/v1/themes/create', body).then(unwrap),
  updateTheme: (themeCode, body) => http.post(`/v1/themes/${themeCode}/update`, body).then(unwrap),
  toggleTheme: (themeCode, isActive) => http.post(`/v1/themes/${themeCode}/toggle`, { isActive }).then(unwrap),
};
