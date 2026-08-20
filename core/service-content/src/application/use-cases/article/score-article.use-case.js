import { meetsMinimumStructure } from '../../../domain/policies/quality-policy.js';
import { countCodeBlocks, wordCount } from '../../../domain/entities/article.js';

export const makeScoreArticle = ({ articleRepo, assetRepo, aiClient }) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);
  const diagrams = await assetRepo.listByArticle(articleId, { kind: 'diagram' });

  const structureOk = meetsMinimumStructure({ diagramCount: diagrams.length, bodyMarkdown: article.bodyMarkdown });
  const { score, report } = await aiClient.scoreArticle(article);

  const finalScore = structureOk ? score : Math.min(score, 60);
  const finalReport = {
    ...report,
    structureOk,
    diagramCount: diagrams.length,
    codeBlockCount: countCodeBlocks(article.bodyMarkdown),
    wordCount: wordCount(article.bodyMarkdown),
  };

  return articleRepo.update(articleId, { qualityScore: finalScore, qualityReport: finalReport });
};
