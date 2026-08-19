// Onaylanmis makaleyi sirayla dev.to'ya, sonra Medium'a (token varsa direkt API, yoksa import-akisi) yayinlar.
export const makePublishOrchestrator = ({ articleRepo, publishToDevto, crosspostToMedium }) => async ({ articleId }) => {
  await articleRepo.update(articleId, { status: 'publishing' });

  const devtoResult = await publishToDevto({ articleId });
  const mediumResult = await crosspostToMedium({ articleId });

  await articleRepo.update(articleId, { status: 'published', canonicalUrl: devtoResult.externalUrl });

  return { devto: devtoResult, medium: mediumResult };
};
