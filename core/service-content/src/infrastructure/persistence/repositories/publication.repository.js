import { toCamel, buildUpdateSet } from '../../helper/row-mapper.js';

export const makePublicationRepository = ({ rawQuery }) => ({
  upsertPending: async ({ articleId, platform }) => {
    const { rows } = await rawQuery(
      `INSERT INTO publications (article_id, platform, status)
       VALUES ($1,$2,'pending')
       ON CONFLICT (article_id, platform) DO UPDATE SET status = 'pending', updated_at = now()
       RETURNING *`,
      [articleId, platform],
    );
    return toCamel(rows[0]);
  },

  findByArticleAndPlatform: async (articleId, platform) => {
    const { rows } = await rawQuery(`SELECT * FROM publications WHERE article_id = $1 AND platform = $2`, [articleId, platform]);
    return toCamel(rows[0]);
  },

  listFailed: async ({ maxAttempts }) => {
    const { rows } = await rawQuery(`SELECT * FROM publications WHERE status = 'failed' AND attempt_count < $1`, [maxAttempts]);
    return rows.map(toCamel);
  },

  update: async (id, patch) => {
    const { setClauses, values } = buildUpdateSet({ ...patch, updatedAt: new Date() });
    const { rows } = await rawQuery(
      `UPDATE publications SET ${setClauses.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toCamel(rows[0]);
  },
});
