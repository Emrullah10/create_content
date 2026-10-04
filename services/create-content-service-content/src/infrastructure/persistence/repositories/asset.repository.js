import { convertObjectToCamelCase } from 'app-shared';
import { makeUpdater, withTx } from '../update-builder.js';

const COLUMNS = `asset_id, asset_article_id, asset_kind, asset_placeholder_key, asset_source_code, asset_alt_text, asset_caption, asset_local_path, asset_remote_url, asset_status, asset_error`;

const buildUpdate = makeUpdater({
  table: 'content.asset',
  keyColumn: 'asset_id',
  prefix: 'asset',
  columns: { sourceCode: 'asset_source_code', altText: 'asset_alt_text', caption: 'asset_caption', localPath: 'asset_local_path', remoteUrl: 'asset_remote_url', status: 'asset_status', error: 'asset_error' },
});

export const makeAssetRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeAssetRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  const one = (res) => (res.rows[0] ? convertObjectToCamelCase(res.rows[0]) : null);
  // Kisa alan adlari: use-case'ler `asset.id`, `asset.sourceCode` gibi okur.
  const shape = (row) => {
    const r = convertObjectToCamelCase(row);
    return { id: r.assetId, articleId: r.assetArticleId, kind: r.assetKind, key: r.assetPlaceholderKey, sourceCode: r.assetSourceCode, altText: r.assetAltText, caption: r.assetCaption, localPath: r.assetLocalPath, remoteUrl: r.assetRemoteUrl, status: r.assetStatus, error: r.assetError };
  };

  return {
    // Placeholder anahtari makale basina tekil: yeniden calistirmada ayni diyagram guncellenir (cift satir olusmaz).
    upsertDiagram: async ({ articleId, key, sourceCode, altText, caption }, { tx } = {}) =>
      shape(
        (
          await run(tx)(
            `INSERT INTO content.asset (asset_article_id, asset_kind, asset_placeholder_key, asset_source_code, asset_alt_text, asset_caption)
             VALUES ($1,'diagram',$2,$3,$4,$5)
             ON CONFLICT (asset_article_id, asset_placeholder_key) WHERE asset_placeholder_key IS NOT NULL
             DO UPDATE SET asset_source_code = EXCLUDED.asset_source_code, asset_alt_text = EXCLUDED.asset_alt_text, asset_caption = EXCLUDED.asset_caption,
                           asset_status = 'pending', asset_error = NULL, asset_updated_at = now()
             RETURNING ${COLUMNS}`,
            [articleId, key, sourceCode, altText ?? null, caption ?? null],
          )
        ).rows[0],
      ),

    upsertCover: async ({ articleId, prompt }, { tx } = {}) => {
      const existing = (await run(tx)(`SELECT ${COLUMNS} FROM content.asset WHERE asset_article_id = $1 AND asset_kind = 'cover' LIMIT 1`, [articleId])).rows[0];
      if (existing) {
        await run(tx)("UPDATE content.asset SET asset_source_code = $2, asset_updated_at = now() WHERE asset_id = $1", [existing.asset_id, prompt]);
        return shape({ ...existing, asset_source_code: prompt });
      }
      return shape((await run(tx)(`INSERT INTO content.asset (asset_article_id, asset_kind, asset_source_code) VALUES ($1,'cover',$2) RETURNING ${COLUMNS}`, [articleId, prompt])).rows[0]);
    },

    listByArticle: async ({ articleId, kind, status }, { tx } = {}) =>
      (await run(tx)(`SELECT ${COLUMNS} FROM content.asset WHERE asset_article_id = $1 AND ($2::text IS NULL OR asset_kind = $2) AND ($3::text IS NULL OR asset_status = $3) ORDER BY asset_id`, [articleId, kind ?? null, status ?? null])).rows.map(shape),

    findById: async ({ assetId }, { tx } = {}) => {
      const row = (await run(tx)(`SELECT ${COLUMNS} FROM content.asset WHERE asset_id = $1`, [assetId])).rows[0];
      return row ? shape(row) : null;
    },

    update: async ({ assetId, patch, now }, { tx } = {}) => {
      const q = buildUpdate({ key: assetId, patch, now });
      if (!q) return null;
      const row = (await run(tx)(`${q.sql} RETURNING ${COLUMNS}`, q.params)).rows[0];
      return row ? shape(row) : null;
    },
    one,
  };
};
