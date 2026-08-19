// Placeholder'lari ({{DIAGRAM_N}}) markdown img+caption ile degistirir.
// Bir placeholder icin yuklu asset yoksa (render/upload basarisiz oldu), makale 'needs_assets'te kalir.
export const makeEmbedAssets = ({ articleRepo, assetRepo }) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);
  const assets = await assetRepo.listByArticle(articleId, { kind: 'diagram' });

  let body = article.bodyMarkdown;
  let allEmbedded = true;

  for (const asset of assets) {
    if (!asset.placeholderKey) continue;
    if (asset.status === 'uploaded' && asset.remoteUrl) {
      const md = `![${asset.altText ?? ''}](${asset.remoteUrl})\n\n*${asset.caption ?? ''}*`;
      body = body.split(asset.placeholderKey).join(md);
    } else {
      allEmbedded = false;
    }
  }

  const coverAssets = await assetRepo.listByArticle(articleId, { kind: 'cover', status: 'uploaded' });
  const coverAssetId = coverAssets[0]?.id ?? null;

  const status = allEmbedded ? 'review' : 'needs_assets';
  return articleRepo.update(articleId, { bodyMarkdown: body, coverAssetId, status });
};
