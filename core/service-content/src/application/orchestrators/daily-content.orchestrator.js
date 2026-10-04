// Gunluk boru hatti: sirada konu -> taslak -> oz-elestiri -> diyagram render -> upload ->
// gomme -> skor -> (skor esigin altindaysa) hedefli revizyon donguleri.
// Her adim kendi use-case'i ile temsil edilir; orchestrator sadece sirayi ve hata izolasyonunu yonetir.
const countEmbeddedImages = (markdown) => (markdown.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;

export const makeDailyContentOrchestrator = ({
  pickNextTopic,
  draftArticle,
  critiqueAndRevise,
  renderDiagrams,
  generateCover,
  uploadAssets,
  embedAssets,
  scoreArticle,
  targetedRevise,
  articleRepo,
  topicRepo,
  qualityThreshold,
  qualityMaxRounds = 2,
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
    let scored = await scoreArticle({ articleId: article.id });

    // Tek atisla eslesmezse hedefli revizyon donguleri: skor raporunu (zayif kriter +
    // weaknesses) modele geri besleyerek revize eder, yeniden skorlar. En iyi versiyon
    // hep saklanir — bir tur skoru DUSURURSE bile makale asla kotulesmez. Durma kosullari:
    // esik gecildi / max tur / bir onceki turdan iyilesme yok (llama plato yapiyorsa
    // bosuna AI cagrisi harcanmaz).
    let best = { bodyMarkdown: embedded.bodyMarkdown, summary: embedded.summary, score: scored.qualityScore, report: scored.qualityReport };

    for (let round = 1; round <= qualityMaxRounds && best.score < qualityThreshold; round++) {
      const revision = await targetedRevise({ articleId: article.id, qualityReport: best.report, qualityThreshold, round });

      // Hedefli revizyon govdeyi degistirir ama gomulu resimleri (![...](...)) korumasi
      // gerekir — modelin onlari dusurdugu turlar reddedilir, best korunur.
      if (countEmbeddedImages(revision.bodyMarkdown) < countEmbeddedImages(best.bodyMarkdown)) break;

      await articleRepo.update(article.id, { bodyMarkdown: revision.bodyMarkdown, summary: revision.summary });
      scored = await scoreArticle({ articleId: article.id });

      if (scored.qualityScore <= best.score) break; // iyilesme yok, dur

      best = { bodyMarkdown: revision.bodyMarkdown, summary: revision.summary, score: scored.qualityScore, report: scored.qualityReport };
    }

    // En iyi versiyon (son tur kotulesmis veya reddedilmis olabilir) kesin olarak yazilir.
    await articleRepo.update(article.id, { bodyMarkdown: best.bodyMarkdown, summary: best.summary, qualityScore: best.score, qualityReport: best.report });

    await topicRepo.update(topic.id, { status: 'used' });

    return { status: 'article_ready', articleId: article.id, quality: best.score, articleStatus: embedded.status };
  } catch (err) {
    // Pipeline'in herhangi bir asamasi kalici olarak basarisiz olursa konu 'approved'a
    // geri doner ki bir sonraki job calistirmasinda tekrar denensin — 'drafting'de
    // sonsuza kadar takili kalmasin (topic-refill de bu konuyu tekrar uretmesin diye).
    await topicRepo.update(topic.id, { status: 'approved' });
    throw err;
  }
};
