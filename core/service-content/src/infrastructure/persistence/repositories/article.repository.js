import { toCamel, buildUpdateSet } from '../../helper/row-mapper.js';

export const makeArticleRepository = ({ rawQuery }) => ({
  create: async (article) => {
    const { rows } = await rawQuery(
      `INSERT INTO articles (topic_id, title, subtitle, slug, body_markdown, summary, tags, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [article.topicId, article.title, article.subtitle, article.slug, article.bodyMarkdown, article.summary, article.tags, article.status],
    );
    return toCamel(rows[0]);
  },

  findById: async (id) => {
    const { rows } = await rawQuery(
      `SELECT a.*, c.remote_url AS cover_image_url
       FROM articles a
       LEFT JOIN assets c ON c.id = a.cover_asset_id
       WHERE a.id = $1`,
      [id],
    );
    return toCamel(rows[0]);
  },

  list: async ({ status } = {}) => {
    const { rows } = status
      ? await rawQuery(
          `SELECT a.*, c.remote_url AS cover_image_url
           FROM articles a
           LEFT JOIN assets c ON c.id = a.cover_asset_id
           WHERE a.status = $1 ORDER BY a.created_at DESC`,
          [status],
        )
      : await rawQuery(
          `SELECT a.*, c.remote_url AS cover_image_url
           FROM articles a
           LEFT JOIN assets c ON c.id = a.cover_asset_id
           ORDER BY a.created_at DESC`,
        );
    return rows.map(toCamel);
  },

  update: async (id, patch) => {
    const { setClauses, values } = buildUpdateSet({ ...patch, updatedAt: new Date() });
    const { rows } = await rawQuery(
      `UPDATE articles SET ${setClauses.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toCamel(rows[0]);
  },
});
