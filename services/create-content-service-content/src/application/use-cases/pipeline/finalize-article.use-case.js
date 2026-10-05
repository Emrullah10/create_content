import { completeStage } from '../../pipeline/common.js';

// SONLANDIRMA: tum diyagramlar ve kapak yuklendiyse `review`, degilse `needs_assets` (panelden asset yeniden denenir).
// Yayin her zaman panel onayiyla: bu use-case ASLA onaylamaz veya yayinlamaz.
export const makeFinalizeArticle = ({ articleRepo, assetRepo, topicRepo, revisionRepo }) => {
  for (const [n, d] of Object.entries({ articleRepo, assetRepo, topicRepo, revisionRepo })) if (!d) throw new Error(`makeFinalizeArticle requires { ${n} }`);
  return async ({ articleId }) => {
    const assets = await assetRepo.listByArticle({ articleId });
    const incomplete = assets.filter((a) => a.status !== 'uploaded');
    const status = incomplete.length ? 'needs_assets' : 'review';
    const article = await articleRepo.findById({ articleId });
    const moved = await articleRepo.transition({ articleId, from: ['drafting', 'needs_assets', 'failed'], to: status });
    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'final', content: { status, incomplete: incomplete.map((a) => a.key || a.kind) } });
    const topic = await topicRepo.findById({ topicId: article.articleTopicId });
    if (topic) await topicRepo.transition({ topicCode: topic.topicCode, from: ['drafting'], to: 'used' });
    return { stage: 'final', status: moved ? status : article.articleStatus, incomplete: incomplete.length };
  };
};
