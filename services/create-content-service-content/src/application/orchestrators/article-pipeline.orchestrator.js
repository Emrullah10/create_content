import { nextStageAfter } from '../../domain/pipeline/stages.js';
import { DomainError } from '../../domain/errors/domain-error.js';

// Pipeline: son tamamlanan asamadan (article_pipeline_stage) devam eder; her asama DB'ye yazar, boylece yarim kalan makale
// yeniden basliyor ve ayni isi tekrar yapmiyor. Bir asama patlarsa makale `failed` olur ve hata mesaji saklanir (panelde "devam et").
// Asama adlari enums.pipeline_stage ile ayni; `editor` asamasi revizyonu da yapar ve `revise` olarak tamamlanir.
export const makeArticlePipeline = ({ stages, articleRepo, logger = console }) => {
  const required = ['research', 'outline', 'draft', 'check', 'editor', 'score', 'assets', 'final'];
  for (const s of required) if (typeof stages?.[s] !== 'function') throw new Error(`makeArticlePipeline requires stages.${s}`);

  const run = async ({ articleId, onProgress }) => {
    let article = await articleRepo.findById({ articleId });
    if (!article) throw new DomainError('ARTICLE_NOT_FOUND', 'article not found');
    if (article.articleStatus === 'failed') article = await articleRepo.transition({ articleId, from: ['failed'], to: 'drafting', patch: { error: null } });
    if (!article || article.articleStatus !== 'drafting') throw new DomainError('ARTICLE_NOT_DRAFTING', `pipeline can only run for drafting articles (status: ${article?.articleStatus})`);

    const results = [];
    let done = article.articlePipelineStage;
    try {
      for (let next = nextStageAfter(done); next; next = nextStageAfter(done)) {
        if (next === 'revise') { done = 'revise'; continue; }
        onProgress?.({ articleId, stage: next });
        const startedAt = Date.now();
        const result = await stages[next]({ articleId });
        results.push({ ...result, ms: Date.now() - startedAt });
        done = next === 'editor' ? 'revise' : next;
      }
    } catch (error) {
      logger.error?.(`[pipeline] article ${articleId} failed at stage after "${done}": ${error.message}`);
      await articleRepo.transition({ articleId, from: ['drafting'], to: 'failed', patch: { error: `${nextStageAfter(done) ?? 'unknown'}: ${error.message}` } });
      return { ok: false, articleId, failedStage: nextStageAfter(done), error: error.message, results };
    }
    return { ok: true, articleId, results };
  };
  return { run };
};
