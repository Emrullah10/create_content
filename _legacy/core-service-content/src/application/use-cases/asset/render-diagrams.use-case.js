import { DiagramRenderFailedError } from '../../../domain/errors/index.js';
import { writeAssetBufferToTmp } from '../../../infrastructure/helper/asset-tmp-writer.js';

const MAX_REPAIR_ROUNDS = 2;

const diagramTypeOf = (source) => source.trim().split('\n')[0].trim().split(/\s+/)[0] ?? 'diagram';

// Gercek mermaid.parse() ile dogrular (renderer'in kendi puppeteer sayfasi icinde —
// regex tabanli guard %25 isabetliydi, bu %100). Gecersizse AI'dan diyagram bazinda
// hedefli onarim ister (tum makaleyi yeniden draft etmek yerine) — parser'in GERCEK
// hata mesajini modele geri besler, bu regex tahmininden cok daha isabetli oluyor.
const validateAndRepair = async (source, { renderer, aiClient }) => {
  let current = source;
  for (let round = 0; round < MAX_REPAIR_ROUNDS; round++) {
    const { valid, error } = await renderer.validateMermaid(current);
    if (valid) return { source: current, error: null };
    const repaired = await aiClient.repairDiagram(current, error, diagramTypeOf(current));
    current = repaired.mermaid;
  }
  const finalCheck = await renderer.validateMermaid(current);
  return { source: current, error: finalCheck.valid ? null : finalCheck.error };
};

export const makeRenderDiagrams = ({ assetRepo, renderer, aiClient }) => async ({ articleId }) => {
  const diagrams = await assetRepo.listByArticle(articleId, { kind: 'diagram', status: 'pending' });

  const results = [];
  for (const asset of diagrams) {
    try {
      const { source, error } = await validateAndRepair(asset.sourceCode, { renderer, aiClient });
      if (error) throw new Error(`mermaid syntax error (unrepaired after ${MAX_REPAIR_ROUNDS} rounds): ${error}`);

      const png = await renderer.renderMermaidToPng(source);
      const localPath = await writeAssetBufferToTmp(asset.id, png);
      const patch = { status: 'rendered', localPath };
      if (source !== asset.sourceCode) patch.sourceCode = source;
      results.push(await assetRepo.update(asset.id, patch));
    } catch (err) {
      await assetRepo.update(asset.id, { status: 'failed', error: err.message });
      results.push({ ...asset, status: 'failed', error: new DiagramRenderFailedError(asset.id, err.message).message });
    }
  }
  return results;
};
