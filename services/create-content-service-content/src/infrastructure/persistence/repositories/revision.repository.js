import { convertObjectToCamelCase } from 'app-shared';
import { withTx } from '../update-builder.js';

export const makeRevisionRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeRevisionRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  return {
    insert: async ({ articleId, stage, model = null, content = {}, inputTokens = null, outputTokens = null }, { tx } = {}) => {
      await run(tx)(
        `INSERT INTO content.article_revision (article_revision_article_id, article_revision_stage, article_revision_model, article_revision_content, article_revision_input_tokens, article_revision_output_tokens)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,
        [articleId, stage, model, JSON.stringify(content), inputTokens, outputTokens],
      );
    },
    listByArticle: async ({ articleId }, { tx } = {}) =>
      (await run(tx)('SELECT article_revision_id, article_revision_stage, article_revision_model, article_revision_content, article_revision_input_tokens, article_revision_output_tokens, article_revision_created_at FROM content.article_revision WHERE article_revision_article_id = $1 ORDER BY article_revision_id', [articleId])).rows.map(convertObjectToCamelCase),
  };
};
