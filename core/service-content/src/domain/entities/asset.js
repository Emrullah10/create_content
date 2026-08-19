export const makeAsset = ({ id, articleId, kind, sourceKind, sourceCode, placeholderKey = null, altText = null, caption = null, status = 'pending' }) => {
  if (!articleId) throw new Error('Asset requires articleId');
  if (!['diagram', 'cover'].includes(kind)) throw new Error(`Invalid asset kind: ${kind}`);
  if (!sourceCode) throw new Error('Asset requires sourceCode');

  return { id, articleId, kind, sourceKind, sourceCode, placeholderKey, altText, caption, status };
};
