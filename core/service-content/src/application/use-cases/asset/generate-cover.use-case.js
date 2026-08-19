import { writeAssetBufferToTmp } from '../../../infrastructure/helper/asset-tmp-writer.js';

export const makeGenerateCover = ({ assetRepo, aiClient }) => async ({ articleId }) => {
  const [cover] = await assetRepo.listByArticle(articleId, { kind: 'cover', status: 'pending' });
  if (!cover) return null;

  try {
    const buffer = await aiClient.generateCoverImage(cover.sourceCode);
    const localPath = await writeAssetBufferToTmp(cover.id, buffer);
    return assetRepo.update(cover.id, { status: 'rendered', localPath });
  } catch (err) {
    return assetRepo.update(cover.id, { status: 'failed', error: err.message });
  }
};
