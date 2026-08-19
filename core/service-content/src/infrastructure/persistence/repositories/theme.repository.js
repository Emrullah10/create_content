import { toCamel, buildUpdateSet } from '../../helper/row-mapper.js';

export const makeThemeRepository = ({ rawQuery }) => ({
  create: async ({ name, description, tags = [], targetAudience = null, weight = 1 }) => {
    const { rows } = await rawQuery(
      `INSERT INTO themes (name, description, tags, target_audience, weight) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description, tags, targetAudience, weight],
    );
    return toCamel(rows[0]);
  },

  findById: async (id) => {
    const { rows } = await rawQuery(`SELECT * FROM themes WHERE id = $1`, [id]);
    return toCamel(rows[0]);
  },

  list: async ({ activeOnly = false } = {}) => {
    const { rows } = await rawQuery(
      activeOnly ? `SELECT * FROM themes WHERE is_active = TRUE ORDER BY name` : `SELECT * FROM themes ORDER BY name`,
    );
    return rows.map(toCamel);
  },

  update: async (id, patch) => {
    const { setClauses, values } = buildUpdateSet({ ...patch, updatedAt: new Date() });
    const { rows } = await rawQuery(
      `UPDATE themes SET ${setClauses.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toCamel(rows[0]);
  },
});
