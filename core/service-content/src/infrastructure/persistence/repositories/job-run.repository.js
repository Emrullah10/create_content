import { toCamel } from '../../helper/row-mapper.js';

export const makeJobRunRepository = ({ rawQuery }) => ({
  start: async (jobName) => {
    const { rows } = await rawQuery(`INSERT INTO job_runs (job_name, status) VALUES ($1, 'running') RETURNING *`, [jobName]);
    return toCamel(rows[0]);
  },

  finish: async (id, { status, stats = {}, error = null }) => {
    const { rows } = await rawQuery(
      `UPDATE job_runs SET status = $1, stats = $2, error = $3, finished_at = now() WHERE id = $4 RETURNING *`,
      [status, stats, error, id],
    );
    return toCamel(rows[0]);
  },
});
