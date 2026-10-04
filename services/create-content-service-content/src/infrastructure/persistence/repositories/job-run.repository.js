import { convertObjectToCamelCase } from 'app-shared';
import { withTx } from '../update-builder.js';

const COLUMNS = 'job_run_id, job_run_job_name, job_run_status, job_run_stats, job_run_error, job_run_started_at, job_run_finished_at';

export const makeJobRunRepository = ({ rawQuery }) => {
  if (!rawQuery) throw new Error('makeJobRunRepository requires { rawQuery }');
  const run = withTx(rawQuery);
  const one = (res) => (res.rows[0] ? convertObjectToCamelCase(res.rows[0]) : null);
  return {
    start: async ({ jobName, stats = {} }, { tx } = {}) => one(await run(tx)(`INSERT INTO content.job_run (job_run_job_name, job_run_stats) VALUES ($1,$2::jsonb) RETURNING ${COLUMNS}`, [jobName, JSON.stringify(stats)])),
    finish: async ({ jobRunId, status, stats, error = null, now = new Date() }, { tx } = {}) =>
      one(await run(tx)(`UPDATE content.job_run SET job_run_status = $2, job_run_stats = $3::jsonb, job_run_error = $4, job_run_finished_at = $5, job_run_updated_at = $5 WHERE job_run_id = $1 RETURNING ${COLUMNS}`, [jobRunId, status, JSON.stringify(stats ?? {}), error, now])),
    update: async ({ jobRunId, stats }, { tx } = {}) => one(await run(tx)(`UPDATE content.job_run SET job_run_stats = $2::jsonb, job_run_updated_at = now() WHERE job_run_id = $1 RETURNING ${COLUMNS}`, [jobRunId, JSON.stringify(stats)])),
    latest: async ({ jobName, limit = 20 } = {}, { tx } = {}) => (await run(tx)(`SELECT ${COLUMNS} FROM content.job_run WHERE ($1::text IS NULL OR job_run_job_name = $1) ORDER BY job_run_id DESC LIMIT $2`, [jobName ?? null, limit])).rows.map(convertObjectToCamelCase),
    // Servis yeniden basladiginda "running" kalmis kayitlar (surec oldu) failed'a cekilir.
    failOrphans: async ({ error = 'process restarted while running' } = {}, { tx } = {}) => (await run(tx)(`UPDATE content.job_run SET job_run_status = 'failed', job_run_error = $1, job_run_finished_at = now() WHERE job_run_status = 'running' RETURNING job_run_id`, [error])).rowCount,
  };
};
