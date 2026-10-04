import { AssetUploadFailedError } from '../../../domain/errors/index.js';

export const makeUploadAssets = ({ assetRepo, imageHost }) => async ({ articleId, slug }) => {
  const rendered = await assetRepo.listByArticle(articleId, { status: 'rendered' });

  const results = [];
  for (const asset of rendered) {
    try {
      const ext = asset.kind === 'cover' ? 'cover.png' : `diagram-${asset.placeholderKey?.match(/\d+/)?.[0] ?? '0'}.png`;
      const path = `articles/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${slug}/${ext}`;
      const { remoteUrl } = await imageHost.upload(path, asset.localPath);
      results.push(await assetRepo.update(asset.id, { status: 'uploaded', remoteUrl }));
    } catch (err) {
      await assetRepo.update(asset.id, { status: 'failed', error: err.message });
      results.push({ ...asset, status: 'failed', error: new AssetUploadFailedError(asset.id, err.message).message });
    }
  }
  return results;
};
