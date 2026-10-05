// Kararli dizi anahtarlari: ['<feature>', '<eylem>', params]
export const QK = Object.freeze({
  dashboard: ['dashboard'],
  themes: ['themes', 'list'],
  topics: (params) => ['topics', 'list', params],
  articles: (params) => ['articles', 'list', params],
  article: (code) => ['articles', 'detail', code],
  publications: ['publications', 'list'],
  authSession: ['auth', 'session'],
});
