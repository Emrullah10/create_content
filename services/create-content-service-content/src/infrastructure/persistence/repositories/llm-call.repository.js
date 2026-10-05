import { convertObjectToCamelCase } from 'app-shared';
import { withTx } from '../update-builder.js';

export const makeLlmCallRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeLlmCallRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  return {
    insert: async ({ articleId = null, role, stage = null, model = null, inputTokens = null, outputTokens = null, durationMs = null, status = 'ok', error = null }, { tx } = {}) => {
      await run(tx)(
        `INSERT INTO content.llm_call (llm_call_article_id, llm_call_role, llm_call_stage, llm_call_model, llm_call_input_tokens, llm_call_output_tokens, llm_call_duration_ms, llm_call_status, llm_call_error)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [articleId, role, stage, model, inputTokens, outputTokens, durationMs, status, error],
      );
    },
    summaryByArticle: async ({ articleId }, { tx } = {}) =>
      (await run(tx)(
        `SELECT llm_call_stage AS stage, llm_call_role AS role, count(*)::int AS calls, coalesce(sum(llm_call_input_tokens),0)::int AS input_tokens,
                coalesce(sum(llm_call_output_tokens),0)::int AS output_tokens, coalesce(sum(llm_call_duration_ms),0)::int AS duration_ms,
                count(*) FILTER (WHERE llm_call_status = 'error')::int AS errors
           FROM content.llm_call WHERE llm_call_article_id = $1 GROUP BY llm_call_stage, llm_call_role ORDER BY min(llm_call_id)`,
        [articleId],
      )).rows.map(convertObjectToCamelCase),
  };
};
