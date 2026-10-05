import { convertObjectToCamelCase } from 'app-shared';
import { makeUpdater, withTx } from '../update-builder.js';

const COLUMNS = `publication_id, publication_article_id, publication_platform, publication_external_id, publication_external_url, publication_status, publication_attempt_count, publication_error, publication_live_at, publication_metadata`;

const buildUpdate = makeUpdater({
  table: 'content.publication',
  keyColumn: 'publication_id',
  prefix: 'publication',
  jsonColumns: ['publication_metadata'],
  columns: { externalId: 'publication_external_id', externalUrl: 'publication_external_url', status: 'publication_status', error: 'publication_error', liveAt: 'publication_live_at', metadata: 'publication_metadata' },
});

export const makePublicationRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makePublicationRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  const one = (res) => (res.rows[0] ? convertObjectToCamelCase(res.rows[0]) : null);

  return {
    listByArticle: async ({ articleId }, { tx } = {}) => (await run(tx)(`SELECT ${COLUMNS} FROM content.publication WHERE publication_article_id = $1 ORDER BY publication_id`, [articleId])).rows.map(convertObjectToCamelCase),

    find: async ({ articleId, platform }, { tx } = {}) => one(await run(tx)(`SELECT ${COLUMNS} FROM content.publication WHERE publication_article_id = $1 AND publication_platform = $2`, [articleId, platform])),

    // Kayit yoksa pending olusturur; VARSA OLDUGU GIBI dondurur (external_id/published durumu SIFIRLANMAZ: yeniden yayin cift post uretmesin).
    ensure: async ({ articleId, platform }, { tx } = {}) => {
      await run(tx)(`INSERT INTO content.publication (publication_article_id, publication_platform) VALUES ($1,$2) ON CONFLICT (publication_article_id, publication_platform) DO NOTHING`, [articleId, platform]);
      return one(await run(tx)(`SELECT ${COLUMNS} FROM content.publication WHERE publication_article_id = $1 AND publication_platform = $2`, [articleId, platform]));
    },

    update: async ({ publicationId, patch, now }, { tx } = {}) => {
      const q = buildUpdate({ key: publicationId, patch, now });
      if (!q) return null;
      return one(await run(tx)(`${q.sql} RETURNING ${COLUMNS}`, q.params));
    },

    incrementAttempts: async ({ publicationId }, { tx } = {}) => one(await run(tx)(`UPDATE content.publication SET publication_attempt_count = publication_attempt_count + 1, publication_updated_at = now() WHERE publication_id = $1 RETURNING ${COLUMNS}`, [publicationId])),

    // Yeniden denenebilir: failed ve deneme sayisi sinirin altinda.
    listRetryable: async ({ maxAttempts = 5 } = {}, { tx } = {}) => (await run(tx)(`SELECT ${COLUMNS} FROM content.publication WHERE publication_status = 'failed' AND publication_attempt_count < $1 ORDER BY publication_id`, [maxAttempts])).rows.map(convertObjectToCamelCase),

    listAll: async ({ limit = 100 } = {}, { tx } = {}) => (await run(tx)(`SELECT p.*, a.article_code, a.article_title FROM content.publication p JOIN content.article a ON a.article_id = p.publication_article_id ORDER BY p.publication_id DESC LIMIT $1`, [limit])).rows.map(convertObjectToCamelCase),
  };
};
