import { PublishFailedError } from '../../../domain/errors/index.js';

export const makePublishToDevto = ({ articleRepo, publicationRepo, devtoPublisher }) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);

  const publication = await publicationRepo.upsertPending({ articleId, platform: 'devto' });

  try {
    const result = await devtoPublisher.publish(article);
    return publicationRepo.update(publication.id, {
      status: 'published',
      externalId: result.externalId,
      externalUrl: result.externalUrl,
      publishedAt: new Date(),
    });
  } catch (err) {
    await publicationRepo.update(publication.id, {
      status: 'failed',
      error: err.message,
      attemptCount: publication.attemptCount + 1,
    });
    throw new PublishFailedError('devto', err.message);
  }
};
