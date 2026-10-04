import { convertObjectToCamelCase } from 'app-shared';
import { makeUpdater, withTx } from '../update-builder.js';
import { dedupKeyOf } from '../../../domain/topic/topic-rules.js';

const SELECT = `t.topic_id, t.topic_code, t.topic_theme_id, th.theme_code, th.theme_name, t.topic_title, t.topic_angle,
  t.topic_keywords, t.topic_author_note, t.topic_status, t.topic_source, t.topic_created_at, t.topic_updated_at`;
const FROM = 'content.topic t JOIN content.theme th ON th.theme_id = t.topic_theme_id';

const buildUpdate = makeUpdater({
  table: 'content.topic',
  keyColumn: 'topic_code',
  prefix: 'topic',
  jsonColumns: ['topic_keywords'],
  columns: { title: 'topic_title', angle: 'topic_angle', keywords: 'topic_keywords', authorNote: 'topic_author_note' },
});

export const makeTopicRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeTopicRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  const many = (res) => res.rows.map(convertObjectToCamelCase);
  const one = (res) => (res.rows[0] ? convertObjectToCamelCase(res.rows[0]) : null);

  const findByCode = async ({ topicCode }, { tx } = {}) => one(await run(tx)(`SELECT ${SELECT} FROM ${FROM} WHERE t.topic_code = $1`, [topicCode]));

  return {
    findByCode,

    // Birebir tekrarda (dedup_key UNIQUE) null doner; cagiran "zaten var" diye sayar.
    insert: async ({ themeId, title, angle, keywords, authorNote, status = 'suggested', source = 'ai', userId }, { tx } = {}) => {
      const res = await run(tx)(
        `INSERT INTO content.topic (topic_theme_id, topic_title, topic_angle, topic_keywords, topic_author_note, topic_status, topic_source, topic_dedup_key, topic_created_by)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9) ON CONFLICT (topic_dedup_key) DO NOTHING RETURNING topic_code`,
        [themeId, title.trim(), angle ?? null, JSON.stringify(keywords ?? []), authorNote ?? null, status, source, dedupKeyOf(title), userId ?? null],
      );
      return res.rows[0] ? findByCode({ topicCode: res.rows[0].topic_code }, { tx }) : null;
    },

    list: async ({ status, themeCode, limit = 100, offset = 0 } = {}, { tx } = {}) =>
      many(
        await run(tx)(
          `SELECT ${SELECT} FROM ${FROM} WHERE ($1::text IS NULL OR t.topic_status = $1) AND ($2::bigint IS NULL OR th.theme_code = $2)
           ORDER BY t.topic_created_at DESC, t.topic_id DESC LIMIT $3 OFFSET $4`,
          [status ?? null, themeCode ?? null, limit, offset],
        ),
      ),

    countByStatus: async ({ themeId } = {}, { tx } = {}) => {
      const res = await run(tx)(`SELECT topic_status AS status, count(*)::int AS n FROM content.topic WHERE ($1::bigint IS NULL OR topic_theme_id = $1) GROUP BY topic_status`, [themeId ?? null]);
      return Object.fromEntries(res.rows.map((r) => [r.status, r.n]));
    },

    // Durum gecisinin kapisi WHERE'de: iki esamanli istekten ikincisi 0 satir gunceller (null doner).
    // authorNote verilmezse (undefined) mevcut not korunur.
    transition: async ({ topicCode, from, to, authorNote, userId = null, now = new Date() }, { tx } = {}) => {
      const res = await run(tx)(
        `UPDATE content.topic SET topic_status = $2, topic_author_note = COALESCE($5, topic_author_note), topic_updated_by = $3, topic_updated_at = $4
          WHERE topic_code = $1 AND topic_status = ANY($6::text[]) RETURNING topic_code`,
        [topicCode, to, userId, now, authorNote ?? null, Array.isArray(from) ? from : [from]],
      );
      return res.rows[0] ? findByCode({ topicCode }, { tx }) : null;
    },

    update: async ({ topicCode, patch, userId, now }, { tx } = {}) => {
      const q = buildUpdate({ key: topicCode, patch, userId, now });
      if (!q) return null;
      const res = await run(tx)(`${q.sql} RETURNING topic_code`, q.params);
      return res.rows[0] ? findByCode({ topicCode }, { tx }) : null;
    },

    // Zamanlayicinin sirasi: aktif temalardan agirliga gore secilen temanin EN ESKI onayli konusu.
    // `FOR UPDATE SKIP LOCKED`: iki surec ayni konuyu alamaz.
    claimNextApproved: async ({ rng = Math.random, userId = null, now = new Date() } = {}, { tx } = {}) => {
      const themes = (
        await run(tx)(
          `SELECT th.theme_id, th.theme_weight FROM content.theme th
            WHERE th.theme_is_active AND EXISTS (SELECT 1 FROM content.topic t WHERE t.topic_theme_id = th.theme_id AND t.topic_status = 'approved')`,
        )
      ).rows;
      if (!themes.length) return null;
      const total = themes.reduce((s, t) => s + t.theme_weight, 0);
      let roll = rng() * total;
      const picked = themes.find((t) => (roll -= t.theme_weight) < 0) ?? themes[0];
      const res = await run(tx)(
        `UPDATE content.topic SET topic_status = 'drafting', topic_updated_by = $2, topic_updated_at = $3
          WHERE topic_id = (SELECT topic_id FROM content.topic WHERE topic_theme_id = $1 AND topic_status = 'approved' ORDER BY topic_created_at, topic_id FOR UPDATE SKIP LOCKED LIMIT 1)
          RETURNING topic_code`,
        [picked.theme_id, userId, now],
      );
      return res.rows[0] ? findByCode({ topicCode: res.rows[0].topic_code }, { tx }) : null;
    },

    // pg_trgm: benzer basliklar (anlamsal tekrar). Birebir ayni olanlar dedup_key ile ayrica elenir.
    findSimilar: async ({ title, threshold }, { tx } = {}) =>
      many(
        await run(tx)(
          `SELECT topic_code, topic_title, topic_status, round(similarity(lower(topic_title), lower($1))::numeric, 2)::float AS similarity
             FROM content.topic WHERE similarity(lower(topic_title), lower($1)) >= $2 ORDER BY similarity DESC LIMIT 5`,
          [title, threshold],
        ),
      ),

    recentTitles: async ({ limit = 80 } = {}, { tx } = {}) => (await run(tx)('SELECT topic_title FROM content.topic ORDER BY topic_id DESC LIMIT $1', [limit])).rows.map((r) => r.topic_title),
  };
};
