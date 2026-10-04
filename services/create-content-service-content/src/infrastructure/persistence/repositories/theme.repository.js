import { convertObjectToCamelCase } from 'app-shared';

// SQL burada yasar; use-case SQL metnini bilmez. Guncellenebilir kolonlar SABIT bir allow-list'ten gelir
// (istemci anahtarlari SQL'e ASLA sizmaz).
const UPDATABLE = Object.freeze({
  name: 'theme_name',
  description: 'theme_description',
  tags: 'theme_tags',
  targetAudience: 'theme_target_audience',
  expertiseNotes: 'theme_expertise_notes',
  weight: 'theme_weight',
  isActive: 'theme_is_active',
});
const JSON_COLUMNS = new Set(['theme_tags']);
const COLUMNS = `theme_id, theme_code, theme_name, theme_description, theme_tags, theme_target_audience,
  theme_expertise_notes, theme_weight, theme_is_active, theme_created_at, theme_updated_at`;

export const makeThemeRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeThemeRepository requires { rawQuery }');
  const run = (tx) => (tx ? (sql, params) => tx.query(sql, params) : rawQuery);
  const one = (res) => (res.rows[0] ? convertObjectToCamelCase(res.rows[0]) : null);

  return {
    findByCode: async ({ themeCode }, { tx } = {}) =>
      one(await run(tx)(`SELECT ${COLUMNS} FROM content.theme WHERE theme_code = $1`, [themeCode])),

    insert: async (data, { tx } = {}) =>
      one(
        await run(tx)(
          `INSERT INTO content.theme (theme_name, theme_description, theme_tags, theme_target_audience, theme_expertise_notes, theme_weight, theme_created_by)
           VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7) RETURNING ${COLUMNS}`,
          [data.name.trim(), data.description ?? null, JSON.stringify(data.tags ?? []), data.targetAudience ?? null, data.expertiseNotes ?? null, data.weight ?? 1, data.userId ?? null],
        ),
      ),

    update: async ({ themeCode, patch, userId, now }, { tx } = {}) => {
      const sets = [];
      const params = [themeCode];
      for (const [key, column] of Object.entries(UPDATABLE)) {
        if (patch[key] === undefined) continue;
        params.push(JSON_COLUMNS.has(column) ? JSON.stringify(patch[key]) : patch[key]);
        sets.push(`${column} = $${params.length}${JSON_COLUMNS.has(column) ? '::jsonb' : ''}`);
      }
      params.push(userId ?? null, now);
      sets.push(`theme_updated_by = $${params.length - 1}`, `theme_updated_at = $${params.length}`);
      return one(await run(tx)(`UPDATE content.theme SET ${sets.join(', ')} WHERE theme_code = $1 RETURNING ${COLUMNS}`, params));
    },
  };
};
