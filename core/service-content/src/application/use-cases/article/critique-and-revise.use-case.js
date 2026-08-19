export const makeCritiqueAndRevise = ({ articleRepo, revisionRepo, aiClient }) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);
  const { revised, notes } = await aiClient.critiqueAndRevise(article);

  await revisionRepo.create({ articleId, stage: 'critique', content: { notes } });
  await revisionRepo.create({ articleId, stage: 'revised', content: revised });

  return articleRepo.update(articleId, {
    bodyMarkdown: revised.bodyMarkdown ?? article.bodyMarkdown,
    summary: revised.summary ?? article.summary,
  });
};
