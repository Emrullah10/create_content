import { NotFoundError } from '../../../domain/errors/index.js';

export const makeUpdateArticle = ({ articleRepo }) => async ({ articleId, patch }) => {
  const article = await articleRepo.findById(articleId);
  if (!article) throw new NotFoundError('Article', articleId);
  return articleRepo.update(articleId, patch);
};
