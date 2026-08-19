import { NotFoundError, QualityBelowThresholdError } from '../../../domain/errors/index.js';
import { passesQualityThreshold } from '../../../domain/policies/quality-policy.js';

export const makeApproveArticle = ({ articleRepo }) => async ({ articleId, qualityThreshold }) => {
  const article = await articleRepo.findById(articleId);
  if (!article) throw new NotFoundError('Article', articleId);

  if (!passesQualityThreshold(article.qualityScore, qualityThreshold)) {
    throw new QualityBelowThresholdError(article.qualityScore, qualityThreshold);
  }

  return articleRepo.update(articleId, { status: 'approved' });
};
