export const ROUTE_PATHS = Object.freeze({
  dashboard: '/',
  themes: '/themes',
  topics: '/topics',
  articles: '/articles',
  article: (code = ':articleCode') => `/articles/${code}`,
  publications: '/publications',
});
