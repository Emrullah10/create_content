import { NotFoundError } from '../../../domain/errors/index.js';

export const makeGetArticle = ({ articleRepo }) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);
  if (!article) throw new NotFoundError('Article', articleId);
  return article;
};

export const makeListArticles = ({ articleRepo }) => async ({ status } = {}) => {
  return articleRepo.list({ status });
};
