import { makeArticle } from '../../../domain/entities/article.js';
import { slugify } from '@create-content/helper';

export const makeDraftArticle = ({ articleRepo, revisionRepo, assetRepo, themeRepo, aiClient }) => async ({ topic }) => {
  const theme = await themeRepo.findById(topic.themeId);
  const expertiseNotes = theme?.expertiseNotes ?? null;

  const outline = await aiClient.generateOutline(topic, expertiseNotes);
  const draft = await aiClient.draftArticle(topic, outline, expertiseNotes);

  const article = makeArticle({
    topicId: topic.id,
    title: draft.title,
    subtitle: draft.subtitle,
    slug: slugify(draft.title),
    bodyMarkdown: draft.bodyMarkdown,
    summary: draft.summary,
    tags: draft.tags,
    status: 'drafting',
  });

  // revision kayitlari article_id NOT NULL oldugu icin makale olusturulduktan SONRA yazilir
  // (outline, makale var olmadan once uretilir ama kaydi makaleyle birlikte tutulur).
  const savedArticle = await articleRepo.create(article);
  await revisionRepo.create({ articleId: savedArticle.id, stage: 'outline', content: outline });
  await revisionRepo.create({ articleId: savedArticle.id, stage: 'draft', content: draft });

  for (const diagram of draft.diagrams ?? []) {
    await assetRepo.create({
      articleId: savedArticle.id,
      kind: 'diagram',
      sourceKind: 'mermaid',
      sourceCode: diagram.mermaid,
      placeholderKey: diagram.key,
      altText: diagram.alt,
      caption: diagram.caption,
      status: 'pending',
    });
  }

  if (draft.coverPrompt) {
    await assetRepo.create({
      articleId: savedArticle.id,
      kind: 'cover',
      sourceKind: 'ai_image',
      sourceCode: draft.coverPrompt,
      status: 'pending',
    });
  }

  return savedArticle;
};
