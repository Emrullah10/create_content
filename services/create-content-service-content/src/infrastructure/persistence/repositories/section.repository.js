import { convertObjectToCamelCase } from 'app-shared';
import { withTx } from '../update-builder.js';

const COLUMNS = 'article_section_id, article_section_article_id, article_section_position, article_section_heading, article_section_plan, article_section_body_markdown, article_section_word_count';

export const makeSectionRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeSectionRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  // Bolum satirlarini kisa alan adlarina cevirir (kind plan icinde saklanir).
  const shape = (row) => {
    const r = convertObjectToCamelCase(row);
    return { id: r.articleSectionId, articleId: r.articleSectionArticleId, position: r.articleSectionPosition, heading: r.articleSectionHeading, plan: r.articleSectionPlan, kind: r.articleSectionPlan?.kind, body: r.articleSectionBodyMarkdown ?? '', wordCount: r.articleSectionWordCount };
  };

  return {
    list: async ({ articleId }, { tx } = {}) => (await run(tx)(`SELECT ${COLUMNS} FROM content.article_section WHERE article_section_article_id = $1 ORDER BY article_section_position`, [articleId])).rows.map(shape),

    // Outline bir kez yazilir; bolumler plan olarak eklenir (govde sonra dolar). Yeniden calistirmada eskisi silinir.
    replacePlan: async ({ articleId, sections }, { tx } = {}) => {
      await run(tx)('DELETE FROM content.article_section WHERE article_section_article_id = $1', [articleId]);
      for (const [i, s] of sections.entries()) {
        await run(tx)(
          `INSERT INTO content.article_section (article_section_article_id, article_section_position, article_section_heading, article_section_plan) VALUES ($1,$2,$3,$4::jsonb)`,
          [articleId, i + 1, s.heading, JSON.stringify(s)],
        );
      }
    },

    setBody: async ({ sectionId, body, wordCount, now = new Date() }, { tx } = {}) => {
      await run(tx)('UPDATE content.article_section SET article_section_body_markdown = $2, article_section_word_count = $3, article_section_updated_at = $4 WHERE article_section_id = $1', [sectionId, body, wordCount, now]);
    },
  };
};
