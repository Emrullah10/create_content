import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { normalizeTags } from '../../../domain/theme/theme-rules.js';

const need = (v, code, msg) => {
  if (!v) throw new DomainError(code, msg);
};
const EDITABLE = ['review', 'needs_assets', 'approved', 'failed'];

const mustFind = async (articleRepo, articleCode) => {
  need(articleCode, 'ARTICLE_CODE_REQUIRED', 'articleCode is required');
  const article = await articleRepo.findByCode({ articleCode });
  need(article, 'ARTICLE_NOT_FOUND', 'article not found');
  return article;
};

export const makeListArticles = ({ articleRepo }) => async ({ caller, status, limit, offset } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentRead);
  const [items, counts] = await Promise.all([articleRepo.list({ status, limit: Math.min(Number(limit) || 100, 500), offset: Number(offset) || 0 }), articleRepo.countByStatus({})]);
  return { items, counts };
};

// Detay: makale + kaynaklar + asset'ler + yayinlar + LLM kullanimi (panel kalite raporu kartlari bunu okur).
export const makeGetArticle = ({ articleRepo, assetRepo, sourceRepo, publicationRepo, llmCallRepo, revisionRepo }) => async ({ caller, articleCode } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentRead);
  const article = await mustFind(articleRepo, articleCode);
  const { articleId } = article;
  const [assets, sources, publications, llmUsage, revisions] = await Promise.all([
    assetRepo.listByArticle({ articleId }),
    sourceRepo.listByArticle({ articleId }),
    publicationRepo.listByArticle({ articleId }),
    llmCallRepo.summaryByArticle({ articleId }),
    revisionRepo.listByArticle({ articleId }),
  ]);
  return { article, assets, sources, publications, llmUsage, stages: revisions.map((r) => ({ stage: r.articleRevisionStage, at: r.articleRevisionCreatedAt, content: r.articleRevisionContent })) };
};

// Panelden duzenleme. Onayli makale duzenlenirse tekrar `review`e doner (onay yeniden alinir).
export const makeUpdateArticle = ({ articleRepo, nowFn = () => new Date() }) => async ({ caller, articleCode, ...body } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentManage);
  const article = await mustFind(articleRepo, articleCode);
  if (!EDITABLE.includes(article.articleStatus)) throw new DomainError('ARTICLE_NOT_EDITABLE', `articles in status "${article.articleStatus}" cannot be edited`);
  const patch = Object.fromEntries(['title', 'subtitle', 'summary', 'bodyMarkdown', 'tags'].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  need(Object.keys(patch).length, 'ARTICLE_NOTHING_TO_UPDATE', 'no updatable field provided');
  if (patch.title !== undefined) need(String(patch.title).trim(), 'ARTICLE_TITLE_REQUIRED', 'title cannot be empty');
  if (patch.bodyMarkdown !== undefined) need(String(patch.bodyMarkdown).trim(), 'ARTICLE_BODY_REQUIRED', 'body cannot be empty');
  if (patch.tags !== undefined) patch.tags = normalizeTags(patch.tags).slice(0, 4);
  if (article.articleStatus === 'approved') patch.status = 'review';
  return articleRepo.update({ articleId: article.articleId, patch, userId: caller.callerUserId, now: nowFn() });
};

// Onay: yalniz `review`. Skor esigin altindaysa `override:true` olmadan onaylanmaz (insan karari acikca verilsin).
export const makeApproveArticle = ({ articleRepo, qualityThreshold = 75, nowFn = () => new Date() }) => async ({ caller, articleCode, override = false } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentPublish);
  const article = await mustFind(articleRepo, articleCode);
  if (article.articleStatus === 'needs_assets') throw new DomainError('ARTICLE_NEEDS_ASSETS', 'Retry the failed assets before approving.');
  if (article.articleQualityScore !== null && article.articleQualityScore < qualityThreshold && !override) {
    throw new DomainError('ARTICLE_BELOW_THRESHOLD', `Quality score ${article.articleQualityScore} is below the threshold ${qualityThreshold}. Approve with override to publish anyway.`, { score: article.articleQualityScore, threshold: qualityThreshold });
  }
  const row = await articleRepo.transition({ articleId: article.articleId, from: ['review'], to: 'approved', userId: caller.callerUserId, now: nowFn() });
  if (!row) throw new DomainError('ARTICLE_NOT_APPROVABLE', `only articles in review can be approved (status: ${article.articleStatus})`);
  return row;
};

// Asset yeniden deneme: yalniz `uploaded` olmayanlari isler, sonra makale review/needs_assets'e yeniden hesaplanir.
export const makeRetryAssets = ({ articleRepo, prepareAssets, finalizeArticle }) => async ({ caller, articleCode } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentRun);
  const article = await mustFind(articleRepo, articleCode);
  if (article.articleStatus !== 'needs_assets') throw new DomainError('ARTICLE_NOT_RETRYABLE', `assets can be retried only for articles in needs_assets (status: ${article.articleStatus})`);
  const assets = await prepareAssets({ articleId: article.articleId });
  const final = await finalizeArticle({ articleId: article.articleId });
  return { ...assets, status: final.status };
};

// Vazgec: makale silinir (kaskad). rewrite:true -> konu tekrar `approved` (yeniden yazilsin), false -> `rejected`.
export const makeAbandonArticle = ({ articleRepo, topicRepo, rawQuery }) => async ({ caller, articleCode, rewrite = false } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentManage);
  const article = await mustFind(articleRepo, articleCode);
  if (['publishing', 'published'].includes(article.articleStatus)) throw new DomainError('ARTICLE_NOT_DELETABLE', 'published articles cannot be discarded');
  await rawQuery('DELETE FROM content.article WHERE article_id = $1', [article.articleId]);
  const topic = await topicRepo.findById({ topicId: article.articleTopicId });
  if (topic) await topicRepo.transition({ topicCode: topic.topicCode, from: ['drafting', 'used'], to: rewrite ? 'approved' : 'rejected', userId: caller.callerUserId });
  return { articleCode, topicCode: topic?.topicCode ?? null, topicStatus: rewrite ? 'approved' : 'rejected' };
};
