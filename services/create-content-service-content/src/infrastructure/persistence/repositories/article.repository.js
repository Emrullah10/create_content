import { convertObjectToCamelCase } from 'app-shared';
import { makeUpdater, withTx } from '../update-builder.js';

const LIST_COLUMNS = `a.article_id, a.article_code, a.article_topic_id, t.topic_code, a.article_title, a.article_subtitle, a.article_slug, a.article_summary,
  a.article_tags, a.article_cover_asset_id, a.article_quality_score, a.article_status, a.article_pipeline_stage, a.article_error,
  a.article_canonical_url, a.article_created_at, a.article_updated_at`;
const DETAIL_COLUMNS = `${LIST_COLUMNS}, a.article_body_markdown, a.article_research_brief, a.article_outline, a.article_quality_report,
  (SELECT asset_remote_url FROM content.asset WHERE asset_id = a.article_cover_asset_id) AS cover_url`;
const FROM = 'content.article a JOIN content.topic t ON t.topic_id = a.article_topic_id';

const buildUpdate = makeUpdater({
  table: 'content.article',
  keyColumn: 'article_id',
  prefix: 'article',
  jsonColumns: ['article_tags', 'article_research_brief', 'article_outline', 'article_quality_report', 'article_metadata'],
  columns: {
    title: 'article_title',
    subtitle: 'article_subtitle',
    summary: 'article_summary',
    bodyMarkdown: 'article_body_markdown',
    tags: 'article_tags',
    coverAssetId: 'article_cover_asset_id',
    researchBrief: 'article_research_brief',
    outline: 'article_outline',
    qualityScore: 'article_quality_score',
    qualityReport: 'article_quality_report',
    status: 'article_status',
    pipelineStage: 'article_pipeline_stage',
    error: 'article_error',
    canonicalUrl: 'article_canonical_url',
    metadata: 'article_metadata',
  },
});

export const makeArticleRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeArticleRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  const one = (res) => (res.rows[0] ? convertObjectToCamelCase(res.rows[0]) : null);
  const many = (res) => res.rows.map(convertObjectToCamelCase);

  const findById = async ({ articleId }, { tx } = {}) => one(await run(tx)(`SELECT ${DETAIL_COLUMNS} FROM ${FROM} WHERE a.article_id = $1`, [articleId]));

  return {
    findById,
    findByCode: async ({ articleCode }, { tx } = {}) => one(await run(tx)(`SELECT ${DETAIL_COLUMNS} FROM ${FROM} WHERE a.article_code = $1`, [articleCode])),

    list: async ({ status, limit = 100, offset = 0 } = {}, { tx } = {}) =>
      many(await run(tx)(`SELECT ${LIST_COLUMNS} FROM ${FROM} WHERE ($1::text IS NULL OR a.article_status = $1) ORDER BY a.article_id DESC LIMIT $2 OFFSET $3`, [status ?? null, limit, offset])),

    countByStatus: async ({ tx } = {}) => Object.fromEntries((await run(tx)('SELECT article_status AS status, count(*)::int AS n FROM content.article GROUP BY article_status')).rows.map((r) => [r.status, r.n])),

    // Slug UNIQUE: cakismada -2, -3 ... eklenir (cakisma gunluk isi kilitlemez).
    insert: async ({ topicId, title, slug, userId = null }, { tx } = {}) => {
      for (let n = 1; n <= 50; n += 1) {
        const candidate = n === 1 ? slug : `${slug}-${n}`;
        const res = await run(tx)(
          `INSERT INTO content.article (article_topic_id, article_title, article_slug, article_created_by) VALUES ($1,$2,$3,$4)
           ON CONFLICT (article_slug) DO NOTHING RETURNING article_id`,
          [topicId, title, candidate, userId],
        );
        if (res.rows[0]) return findById({ articleId: res.rows[0].article_id }, { tx });
      }
      throw new Error(`could not allocate a unique slug for "${slug}"`);
    },

    update: async ({ articleId, patch, userId, now }, { tx } = {}) => {
      const q = buildUpdate({ key: articleId, patch, userId, now });
      if (!q) return findById({ articleId }, { tx });
      await run(tx)(q.sql, q.params);
      return findById({ articleId }, { tx });
    },

    // Durum gecisinin kapisi WHERE'de (kosullu UPDATE); gecis olmadiysa null.
    transition: async ({ articleId, from, to, patch = {}, userId, now = new Date() }, { tx } = {}) => {
      const q = buildUpdate({ key: articleId, patch: { ...patch, status: to }, userId, now });
      const res = await run(tx)(`${q.sql} AND article_status = ANY($${q.params.length + 1}::text[]) RETURNING article_id`, [...q.params, Array.isArray(from) ? from : [from]]);
      return res.rows[0] ? findById({ articleId }, { tx }) : null;
    },

    // Panelden calisan veya cokmus pipeline'lari tespit icin.
    listStuckDrafting: async ({ olderThanMinutes = 30 } = {}, { tx } = {}) =>
      many(await run(tx)(`SELECT ${LIST_COLUMNS} FROM ${FROM} WHERE a.article_status = 'drafting' AND a.article_updated_at < now() - ($1 || ' minutes')::interval`, [String(olderThanMinutes)])),
  };
};
