import { toCamel, buildUpdateSet } from '../../helper/row-mapper.js';

export const makeAssetRepository = ({ rawQuery }) => ({
  create: async (asset) => {
    const { rows } = await rawQuery(
      `INSERT INTO assets (article_id, kind, source_kind, source_code, placeholder_key, alt_text, caption, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [asset.articleId, asset.kind, asset.sourceKind, asset.sourceCode, asset.placeholderKey, asset.altText, asset.caption, asset.status],
    );
    return toCamel(rows[0]);
  },

  listByArticle: async (articleId, { kind, status } = {}) => {
    const conditions = ['article_id = $1'];
    const params = [articleId];
    if (kind) { params.push(kind); conditions.push(`kind = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }

    const { rows } = await rawQuery(`SELECT * FROM assets WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC`, params);
    return rows.map(toCamel);
  },

  update: async (id, patch) => {
    // localBuffer bellek-ici bir alan, DB'ye yazilmaz (yalniz local_path/remote_url kalicidir)
    const { localBuffer, ...persistable } = patch;
    const { setClauses, values } = buildUpdateSet({ ...persistable, updatedAt: new Date() });
    const { rows } = await rawQuery(
      `UPDATE assets SET ${setClauses.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return { ...toCamel(rows[0]), localBuffer };
  },
});
