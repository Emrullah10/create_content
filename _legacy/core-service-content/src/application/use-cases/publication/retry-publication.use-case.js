const MAX_ATTEMPTS = 5;

export const makeRetryPublication = ({ publicationRepo, publishers }) => async () => {
  const failed = await publicationRepo.listFailed({ maxAttempts: MAX_ATTEMPTS });

  const results = [];
  for (const pub of failed) {
    const publisher = publishers[pub.platform];
    if (!publisher) continue;
    try {
      const article = await publisher.getArticleFor(pub.articleId);
      const result = await publisher.publish(article);
      results.push(await publicationRepo.update(pub.id, {
        status: 'published',
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        publishedAt: new Date(),
      }));
    } catch (err) {
      results.push(await publicationRepo.update(pub.id, {
        status: 'failed',
        error: err.message,
        attemptCount: pub.attemptCount + 1,
      }));
    }
  }
  return results;
};
