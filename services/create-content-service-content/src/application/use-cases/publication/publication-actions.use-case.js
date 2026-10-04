import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { isMediumUrl } from '../../../domain/publication/devto-payload.js';

export const makeListPublications = ({ publicationRepo }) => async ({ caller, limit } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentRead);
  return { items: await publicationRepo.listAll({ limit: Math.min(Number(limit) || 100, 500) }) };
};

// Medium'a aktarma elle yapilir (yeni entegrasyon tokeni verilmiyor): kullanici import eder, Medium URL'ini buraya yapistirir.
export const makeConfirmMediumImport = ({ articleRepo, publicationRepo, nowFn = () => new Date() }) => async ({ caller, articleCode, mediumUrl } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentPublish);
  if (!articleCode) throw new DomainError('ARTICLE_CODE_REQUIRED', 'articleCode is required');
  if (!isMediumUrl(mediumUrl)) throw new DomainError('MEDIUM_URL_INVALID', 'mediumUrl must be an https://medium.com/... (or *.medium.com) address');
  const article = await articleRepo.findByCode({ articleCode });
  if (!article) throw new DomainError('ARTICLE_NOT_FOUND', 'article not found');
  if (article.articleStatus !== 'published') throw new DomainError('ARTICLE_NOT_PUBLISHED', 'publish to dev.to (live) first; Medium imports the live dev.to post');
  const medium = await publicationRepo.ensure({ articleId: article.articleId, platform: 'medium' });
  return publicationRepo.update({ publicationId: medium.publicationId, patch: { status: 'published', externalUrl: mediumUrl, liveAt: nowFn(), error: null }, now: nowFn() });
};

// Cron: yalniz yeniden denenebilir (failed, deneme siniri altinda) dev.to yayinlari; makale hala `approved` ise ve son denemenin kipiyle.
export const makeRetryPublications = ({ publicationRepo, articleRepo, publish, maxAttempts = 5, logger = console }) => async ({ caller } = {}) => {
  const failed = (await publicationRepo.listRetryable({ maxAttempts })).filter((p) => p.publicationPlatform === 'devto');
  const results = [];
  for (const p of failed) {
    const article = await articleRepo.findById({ articleId: p.publicationArticleId });
    if (!article || article.articleStatus !== 'approved') continue;
    try {
      await publish({ caller, articleCode: article.articleCode, mode: p.publicationMetadata?.mode });
      results.push({ articleCode: article.articleCode, ok: true });
    } catch (error) {
      logger.warn?.(`[publish-retry] ${article.articleCode}: ${error.message}`);
      results.push({ articleCode: article.articleCode, ok: false, error: error.message });
    }
  }
  return { retried: results.length, succeeded: results.filter((r) => r.ok).length, results };
};
