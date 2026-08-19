// Gunluk boru hatti: sirada konu -> taslak -> oz-elestiri -> diyagram render -> upload -> gomme -> skor
// Her adim kendi use-case'i ile temsil edilir; orchestrator sadece sirayi ve hata izolasyonunu yonetir.
export const makeDailyContentOrchestrator = ({
  pickNextTopic,
  draftArticle,
  critiqueAndRevise,
  renderDiagrams,
  generateCover,
  uploadAssets,
  embedAssets,
  scoreArticle,
  topicRepo,
}) => async () => {
  const topic = await pickNextTopic();
  if (!topic) return { status: 'no_topic_available' };

  await topicRepo.update(topic.id, { status: 'drafting' });

  try {
    const article = await draftArticle({ topic });
    await critiqueAndRevise({ articleId: article.id });
    await renderDiagrams({ articleId: article.id });
    await generateCover({ articleId: article.id });
    await uploadAssets({ articleId: article.id, slug: article.slug });
    const embedded = await embedAssets({ articleId: article.id });
    const scored = await scoreArticle({ articleId: article.id });

    await topicRepo.update(topic.id, { status: 'used' });

    return { status: 'article_ready', articleId: article.id, quality: scored.qualityScore, articleStatus: embedded.status };
  } catch (err) {
    // Pipeline'in herhangi bir asamasi kalici olarak basarisiz olursa konu 'approved'a
    // geri doner ki bir sonraki job calistirmasinda tekrar denensin — 'drafting'de
    // sonsuza kadar takili kalmasin (topic-refill de bu konuyu tekrar uretmesin diye).
    await topicRepo.update(topic.id, { status: 'approved' });
    throw err;
  }
};
