import { toCamel } from '../../helper/row-mapper.js';

export const makeArticleRevisionRepository = ({ rawQuery }) => ({
  create: async ({ articleId, stage, model = null, content, promptTokens = null, completionTokens = null }) => {
    const { rows } = await rawQuery(
      `INSERT INTO article_revisions (article_id, stage, model, content, prompt_tokens, completion_tokens)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [articleId, stage, model, content, promptTokens, completionTokens],
    );
    return toCamel(rows[0]);
  },

  listByArticle: async (articleId) => {
    const { rows } = await rawQuery(`SELECT * FROM article_revisions WHERE article_id = $1 ORDER BY created_at ASC`, [articleId]);
    return rows.map(toCamel);
  },
});
