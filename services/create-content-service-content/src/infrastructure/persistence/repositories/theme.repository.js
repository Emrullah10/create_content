import { convertObjectToCamelCase } from 'app-shared';
import { makeUpdater, withTx } from '../update-builder.js';

const COLUMNS = `theme_id, theme_code, theme_name, theme_description, theme_tags, theme_target_audience,
  theme_expertise_notes, theme_weight, theme_is_active, theme_created_at, theme_updated_at`;

const buildUpdate = makeUpdater({
  table: 'content.theme',
  keyColumn: 'theme_code',
  prefix: 'theme',
  jsonColumns: ['theme_tags'],
  columns: {
    name: 'theme_name',
    description: 'theme_description',
    tags: 'theme_tags',
    targetAudience: 'theme_target_audience',
    expertiseNotes: 'theme_expertise_notes',
    weight: 'theme_weight',
    isActive: 'theme_is_active',
  },
});

export const makeThemeRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeThemeRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  const one = (res) => (res.rows[0] ? convertObjectToCamelCase(res.rows[0]) : null);

  return {
    findByCode: async ({ themeCode }, { tx } = {}) => one(await run(tx)(`SELECT ${COLUMNS} FROM content.theme WHERE theme_code = $1`, [themeCode])),
    findById: async ({ themeId }, { tx } = {}) => one(await run(tx)(`SELECT ${COLUMNS} FROM content.theme WHERE theme_id = $1`, [themeId])),
    listActive: async ({ tx } = {}) => (await run(tx)(`SELECT ${COLUMNS} FROM content.theme WHERE theme_is_active ORDER BY theme_id`)).rows.map(convertObjectToCamelCase),

    insert: async (data, { tx } = {}) =>
      one(
        await run(tx)(
          `INSERT INTO content.theme (theme_name, theme_description, theme_tags, theme_target_audience, theme_expertise_notes, theme_weight, theme_created_by)
           VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7) RETURNING ${COLUMNS}`,
          [data.name.trim(), data.description ?? null, JSON.stringify(data.tags ?? []), data.targetAudience ?? null, data.expertiseNotes ?? null, data.weight ?? 1, data.userId ?? null],
        ),
      ),

    update: async ({ themeCode, patch, userId, now }, { tx } = {}) => {
      const q = buildUpdate({ key: themeCode, patch, userId, now });
      if (!q) return null;
      return one(await run(tx)(`${q.sql} RETURNING ${COLUMNS}`, q.params));
    },
  };
};
