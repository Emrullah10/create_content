import { toCamel, buildUpdateSet } from '../../helper/row-mapper.js';

export const makeTopicRepository = ({ rawQuery }) => ({
  create: async (topic) => {
    const { rows } = await rawQuery(
      `INSERT INTO topics (theme_id, title, angle, outline, keywords, status, dedup_hash, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [topic.themeId, topic.title, topic.angle, topic.outline, topic.keywords, topic.status, topic.dedupHash, topic.createdBy],
    );
    return toCamel(rows[0]);
  },

  findById: async (id) => {
    const { rows } = await rawQuery(`SELECT * FROM topics WHERE id = $1`, [id]);
    return toCamel(rows[0]);
  },

  findOldestApprovedByTheme: async (themeId) => {
    const { rows } = await rawQuery(
      `SELECT * FROM topics WHERE theme_id = $1 AND status = 'approved' ORDER BY created_at ASC LIMIT 1`,
      [themeId],
    );
    return toCamel(rows[0]);
  },

  findOldestApproved: async () => {
    const { rows } = await rawQuery(`SELECT * FROM topics WHERE status = 'approved' ORDER BY created_at ASC LIMIT 1`);
    return toCamel(rows[0]);
  },

  listDedupHashes: async () => {
    const { rows } = await rawQuery(`SELECT dedup_hash FROM topics`);
    return rows.map((r) => r.dedup_hash);
  },

  listTitlesByTheme: async (themeId) => {
    const { rows } = await rawQuery(`SELECT title FROM topics WHERE theme_id = $1`, [themeId]);
    return rows.map((r) => r.title);
  },

  list: async ({ status } = {}) => {
    const { rows } = status
      ? await rawQuery(`SELECT * FROM topics WHERE status = $1 ORDER BY created_at DESC`, [status])
      : await rawQuery(`SELECT * FROM topics ORDER BY created_at DESC`);
    return rows.map(toCamel);
  },

  update: async (id, patch) => {
    const { setClauses, values } = buildUpdateSet({ ...patch, updatedAt: new Date() });
    const { rows } = await rawQuery(
      `UPDATE topics SET ${setClauses.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toCamel(rows[0]);
  },
});
