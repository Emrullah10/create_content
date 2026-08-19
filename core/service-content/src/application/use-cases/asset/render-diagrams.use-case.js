import { DiagramRenderFailedError } from '../../../domain/errors/index.js';
import { writeAssetBufferToTmp } from '../../../infrastructure/helper/asset-tmp-writer.js';

export const makeRenderDiagrams = ({ assetRepo, renderer }) => async ({ articleId }) => {
  const diagrams = await assetRepo.listByArticle(articleId, { kind: 'diagram', status: 'pending' });

  const results = [];
  for (const asset of diagrams) {
    try {
      const png = await renderer.renderMermaidToPng(asset.sourceCode);
      const localPath = await writeAssetBufferToTmp(asset.id, png);
      results.push(await assetRepo.update(asset.id, { status: 'rendered', localPath }));
    } catch (err) {
      await assetRepo.update(asset.id, { status: 'failed', error: err.message });
      results.push({ ...asset, status: 'failed', error: new DiagramRenderFailedError(asset.id, err.message).message });
    }
  }
  return results;
};
