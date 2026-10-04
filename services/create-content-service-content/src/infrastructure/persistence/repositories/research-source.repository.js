import { convertObjectToCamelCase } from 'app-shared';
import { withTx } from '../update-builder.js';

export const makeResearchSourceRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeResearchSourceRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  return {
    // Yeniden calistirmada eski kaynaklar silinip yenileri yazilir.
    replaceAll: async ({ articleId, sources }, { tx } = {}) => {
      await run(tx)('DELETE FROM content.research_source WHERE research_source_article_id = $1', [articleId]);
      for (const s of sources) {
        await run(tx)(
          `INSERT INTO content.research_source (research_source_article_id, research_source_kind, research_source_url, research_source_title, research_source_facts, research_source_http_status, research_source_is_verified)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7) ON CONFLICT (research_source_article_id, research_source_url) DO NOTHING`,
          [articleId, s.kind, s.url, s.title ?? null, JSON.stringify(s.facts ?? []), s.httpStatus ?? 200, s.verified ?? true],
        );
      }
    },
    listByArticle: async ({ articleId }, { tx } = {}) => (await run(tx)('SELECT research_source_kind, research_source_url, research_source_title, research_source_facts, research_source_is_verified FROM content.research_source WHERE research_source_article_id = $1 ORDER BY research_source_id', [articleId])).rows.map(convertObjectToCamelCase),
  };
};
