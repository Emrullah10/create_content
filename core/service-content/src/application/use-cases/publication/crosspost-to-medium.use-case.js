import { MediumTokenMissingError } from '../../../domain/errors/index.js';

// mediumApiPublisher.isAvailable() false ise (token yok/gecersiz) import-akisina duser:
// publication 'pending_import' olarak kaydedilir, panelde manuel import butonu tetiklenir.
export const makeCrosspostToMedium = ({ articleRepo, publicationRepo, mediumApiPublisher, mediumImportPublisher }) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);
  const devtoPub = await publicationRepo.findByArticleAndPlatform(articleId, 'devto');

  const publication = await publicationRepo.upsertPending({ articleId, platform: 'medium' });

  const tokenAvailable = await mediumApiPublisher.isAvailable();

  if (!tokenAvailable) {
    await publicationRepo.update(publication.id, {
      status: 'pending_import',
      error: new MediumTokenMissingError().message,
    });
    return mediumImportPublisher.publish({ ...article, canonicalUrl: devtoPub?.externalUrl });
  }

  const result = await mediumApiPublisher.publish({ ...article, canonicalUrl: devtoPub?.externalUrl });
  return publicationRepo.update(publication.id, {
    status: 'published',
    externalId: result.externalId,
    externalUrl: result.externalUrl,
    publishedAt: new Date(),
  });
};
