export const makePublication = ({ id, articleId, platform, status = 'pending', externalId = null, externalUrl = null, attemptCount = 0 }) => {
  if (!articleId) throw new Error('Publication requires articleId');
  if (!['devto', 'medium'].includes(platform)) throw new Error(`Invalid platform: ${platform}`);

  return { id, articleId, platform, status, externalId, externalUrl, attemptCount };
};
