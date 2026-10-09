// Panelden "yeniden puanla ve iyileştir": yalniz otomatik iyilestirme dongusu HIC calismamis, esigin altindaki
// review/needs_assets makalesinde izinlidir (eski kodla puanlanmis ya da QUALITY_IMPROVE_ROUNDS=0 iken yazilmis makale).
// Dongu zaten calistiysa (tutulan/geri alinan/hatali tur farketmez) buton pasiftir: ayni isi tekrar odemeyelim.
export const IMPROVABLE_STATUSES = Object.freeze(['review', 'needs_assets']);

export const canImprove = (article, threshold) =>
  IMPROVABLE_STATUSES.includes(article.articleStatus) &&
  typeof article.articleQualityScore === 'number' &&
  article.articleQualityScore < threshold &&
  !(article.articleQualityReport?.improveRounds?.length > 0);
