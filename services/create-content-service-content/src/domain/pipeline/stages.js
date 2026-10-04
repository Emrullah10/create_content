// Pipeline asamalari (enums.pipeline_stage ile birebir). article_pipeline_stage = SON TAMAMLANAN asama;
// orkestrator bir sonrakinden devam eder, boylece yarim kalan makale yeniden basliyor ve ayni isi iki kez yapmiyor.
export const STAGES = Object.freeze(['research', 'outline', 'draft', 'check', 'editor', 'revise', 'score', 'assets', 'final']);

export const nextStageAfter = (done) => (done ? STAGES[STAGES.indexOf(done) + 1] ?? null : STAGES[0]);
export const stageIndex = (s) => STAGES.indexOf(s);
