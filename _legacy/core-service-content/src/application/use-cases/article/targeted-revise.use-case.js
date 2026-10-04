// Skor tabanli tek revizyon turu: mevcut makale + son skor raporunu AI'a verir, govdeyi
// gunceller. Dongu (kac tur, ne zaman durulur, en iyi versiyonun saklanmasi) orchestrator'in
// sorumlulugunda — bu use-case sadece TEK turu temsil eder (diger AI cagrilari ile ayni desen).
export const makeTargetedRevise = ({ articleRepo, revisionRepo, aiClient }) => async ({ articleId, qualityReport, qualityThreshold, round }) => {
  const article = await articleRepo.findById(articleId);
  const revision = await aiClient.targetedRevise(article, qualityReport, qualityThreshold);

  await revisionRepo.create({ articleId, stage: 'revised', content: { round, changes: revision.changes } });

  return { bodyMarkdown: revision.bodyMarkdown, summary: revision.summary };
};
