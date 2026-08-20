import { wordCount } from '../../../domain/entities/article.js';
import { MIN_WORD_COUNT } from '../../../domain/policies/quality-policy.js';

export const makeCritiqueAndRevise = ({ articleRepo, revisionRepo, topicRepo, themeRepo, aiClient }) => async ({ articleId }) => {
  const article = await articleRepo.findById(articleId);
  const { revised, notes } = await aiClient.critiqueAndRevise(article);

  await revisionRepo.create({ articleId, stage: 'critique', content: { notes } });
  await revisionRepo.create({ articleId, stage: 'revised', content: revised });

  let bodyMarkdown = revised.bodyMarkdown ?? article.bodyMarkdown;
  let summary = revised.summary ?? article.summary;

  // meta/llama-3.3-70b-instruct (NVIDIA free tier'da erisilebilen tek buyuk model)
  // draft+critique sonrasi bile 1200-1800 hedefine rutin ulasamiyor (dogrulandi:
  // uc farkli prompt stratejisi 380-900 kelime bandinda kaldi). Hala esik altindaysa
  // dar kapsamli, sadece-genislet bir tur daha calistirilir.
  if (wordCount(bodyMarkdown) < MIN_WORD_COUNT) {
    const topic = await topicRepo.findById(article.topicId);
    const theme = topic ? await themeRepo.findById(topic.themeId) : null;
    const expertiseNotes = theme?.expertiseNotes ?? null;

    const expanded = await aiClient.expandArticle({ ...article, bodyMarkdown, summary }, wordCount(bodyMarkdown), expertiseNotes);
    await revisionRepo.create({ articleId, stage: 'expand', content: expanded });
    if (wordCount(expanded.bodyMarkdown) > wordCount(bodyMarkdown)) {
      bodyMarkdown = expanded.bodyMarkdown;
      summary = expanded.summary ?? summary;
    }
  }

  return articleRepo.update(articleId, { bodyMarkdown, summary });
};
