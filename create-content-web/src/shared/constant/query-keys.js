export const queryKeys = {
  themes: ['themes'],
  topics: (status) => ['topics', status],
  articles: (status) => ['articles', status],
  article: (id) => ['articles', id],
};
