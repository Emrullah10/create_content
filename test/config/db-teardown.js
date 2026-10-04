import pg from 'pg';
import { loadTestEnv, workerDbNames } from './test-env.js';

export default async function teardown(globalConfig) {
  const cfg = loadTestEnv();
  const dbs = workerDbNames(cfg.base, globalConfig?.maxWorkers);
  if (process.env.TEST_REUSE_DB === '1') {
    console.log(`[test-teardown] TEST_REUSE_DB=1: ${dbs.length} worker DB birakildi`);
    return;
  }
  const admin = new pg.Client({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database: 'postgres' });
  try {
    await admin.connect();
    await admin.query('SET lock_timeout = 15000');
    for (const db of dbs) {
      await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND usename = current_user AND pid <> pg_backend_pid()', [db]);
      await admin.query(`DROP DATABASE IF EXISTS "${db}"`);
    }
    console.log(`[test-teardown] Silindi: ${dbs.join(', ')}`);
  } catch (error) {
    console.error('[test-teardown] Silinemedi:', error.message);
  } finally {
    await admin.end().catch(() => {});
  }
}
