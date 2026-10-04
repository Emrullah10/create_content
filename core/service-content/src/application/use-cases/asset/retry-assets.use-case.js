// Basarisiz asset'leri (diyagram render/upload hatasi, kapak uretim hatasi) kurtarma yolu.
// Yeni render/upload/embed mantigi yazmaz — 'failed' asset'leri 'pending'e geri cekip
// MEVCUT use-case'leri (renderDiagrams, generateCover, uploadAssets, embedAssets) tekrar
// cagirir; onlar zaten status='pending'/'rendered' filtresiyle calisiyor.
export const makeRetryAssets = ({
  assetRepo,
  articleRepo,
  renderDiagrams,
  generateCover,
  uploadAssets,
  embedAssets,
  // Retry, tanim geregi "son care" kurtarma yolu: kalan bir diyagram/kapak hala
  // gomulemiyorsa makale kalici olarak needs_assets'te olu kalmak yerine kalan
  // asset'lerle review'a gecer (bkz embed-assets.use-case.js degradeMode notu).
  degradeMode = true,
}) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);

  const failedDiagrams = await assetRepo.listByArticle(articleId, { kind: 'diagram', status: 'failed' });
  const failedCovers = await assetRepo.listByArticle(articleId, { kind: 'cover', status: 'failed' });

  await Promise.all([
    ...failedDiagrams.map((asset) => assetRepo.update(asset.id, { status: 'pending', error: null })),
    ...failedCovers.map((asset) => assetRepo.update(asset.id, { status: 'pending', error: null })),
  ]);

  await renderDiagrams({ articleId });
  await generateCover({ articleId });
  await uploadAssets({ articleId, slug: article.slug });

  return embedAssets({ articleId, degradeMode });
};
