import crypto from 'node:crypto';

export const computeDedupHash = (title) =>
  crypto.createHash('sha256').update(title.trim().toLowerCase()).digest('hex');

export const makeTopic = ({ id, themeId, title, angle = null, outline = null, keywords = [], status = 'suggested', createdBy = 'ai' }) => {
  if (!themeId) throw new Error('Topic requires themeId');
  if (!title || !title.trim()) throw new Error('Topic requires a non-empty title');

  return {
    id,
    themeId,
    title: title.trim(),
    angle,
    outline,
    keywords,
    status,
    dedupHash: computeDedupHash(title),
    createdBy,
  };
};
