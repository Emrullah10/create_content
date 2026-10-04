import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { buildDevtoPayload, mediumImportUrl } from '../../../domain/publication/devto-payload.js';

const MODES = ['draft', 'live'];

// dev.to YAYINI (yalniz `approved` makale). Idempotent:
//  - zaten canli ve mode=live ise tekrar gonderilmez;
//  - publication.external_id varsa PUT (guncelleme), yoksa POST;
//  - onceki bir deneme belirsiz bittiyse (5xx/zaman asimi: yayin yapilmis olabilir) POST'tan ONCE basliga gore var olan aranir ve benimsenir.
// Durum: draft modu dev.to'da TASLAK olusturur, makale `approved` kalir (publication=draft). live modu makaleyi `published` yapar,
// canonical_url'i yazar ve Medium icin `pending_import` kaydi acar. Hata olursa makale `approved`a doner, publication `failed` olur.
export const makePublishToDevto = ({ articleRepo, publicationRepo, devto, defaultMode = 'draft', nowFn = () => new Date() }) => {
  for (const [n, d] of Object.entries({ articleRepo, publicationRepo, devto })) if (!d) throw new Error(`makePublishToDevto requires { ${n} }`);

  return async ({ caller, articleCode, mode } = {}) => {
    requireCallerPermission(caller, PERMISSIONS.contentPublish);
    if (!articleCode) throw new DomainError('ARTICLE_CODE_REQUIRED', 'articleCode is required');
    const effectiveMode = mode ?? defaultMode;
    if (!MODES.includes(effectiveMode)) throw new DomainError('PUBLISH_MODE_INVALID', 'mode must be draft or live');
    const article = await articleRepo.findByCode({ articleCode });
    if (!article) throw new DomainError('ARTICLE_NOT_FOUND', 'article not found');

    const existing = await publicationRepo.find({ articleId: article.articleId, platform: 'devto' });
    if (article.articleStatus === 'published' && effectiveMode === 'live' && existing?.publicationStatus === 'published') return { alreadyPublished: true, article, publication: existing };

    const gated = await articleRepo.transition({ articleId: article.articleId, from: ['approved'], to: 'publishing', userId: caller.callerUserId, now: nowFn() });
    if (!gated) throw new DomainError('ARTICLE_NOT_PUBLISHABLE', `only approved articles can be published (status: ${article.articleStatus})`);

    const publication = await publicationRepo.ensure({ articleId: article.articleId, platform: 'devto' });
    const previousAttempts = publication.publicationAttemptCount;
    await publicationRepo.incrementAttempts({ publicationId: publication.publicationId });

    try {
      const payload = buildDevtoPayload({ article, coverUrl: article.coverUrl, published: effectiveMode === 'live' });
      let remote;
      if (publication.publicationExternalId) {
        remote = await devto.update(publication.publicationExternalId, payload);
      } else {
        const adopted = previousAttempts > 0 ? await devto.findByTitle(payload.title) : null;
        remote = adopted ? await devto.update(adopted.id, payload) : await devto.create(payload);
      }
      const live = remote.published;
      const saved = await publicationRepo.update({
        publicationId: publication.publicationId,
        patch: { status: live ? 'published' : 'draft', externalId: remote.id, externalUrl: remote.url, liveAt: live ? nowFn() : null, error: null, metadata: { mode: effectiveMode } },
        now: nowFn(),
      });
      const next = await articleRepo.transition({ articleId: article.articleId, from: ['publishing'], to: live ? 'published' : 'approved', patch: live ? { canonicalUrl: remote.url } : {}, userId: caller.callerUserId, now: nowFn() });
      if (live) {
        const medium = await publicationRepo.ensure({ articleId: article.articleId, platform: 'medium' });
        if (medium.publicationStatus !== 'published') await publicationRepo.update({ publicationId: medium.publicationId, patch: { status: 'pending_import', metadata: { importUrl: mediumImportUrl(remote.url) } }, now: nowFn() });
      }
      return { alreadyPublished: false, article: next, publication: saved };
    } catch (error) {
      await publicationRepo.update({ publicationId: publication.publicationId, patch: { status: 'failed', error: error.message, metadata: { mode: effectiveMode } }, now: nowFn() });
      await articleRepo.transition({ articleId: article.articleId, from: ['publishing'], to: 'approved', now: nowFn() });
      throw new DomainError('PUBLISH_FAILED', `dev.to publishing failed: ${error.message}`, { status: error.status ?? null });
    }
  };
};
