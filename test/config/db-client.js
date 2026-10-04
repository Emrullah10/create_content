import pg from 'pg';
import { loadTestEnv } from './test-env.js';

const pools = {};

// Worker'in test DB'sine havuz. TEST_DB_NAME worker-db.js'te ayarlanir.
export function getTestPool(name = 'default') {
  if (!pools[name]) {
    const cfg = loadTestEnv();
    pools[name] = new pg.Pool({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database: process.env.TEST_DB_NAME });
    // Teardown bosta kalan baglantilari koparabilir; dinleyici yoksa 'Unhandled error' ile surec duser.
    pools[name].on('error', () => {});
  }
  return pools[name];
}

// Test izolasyonu: sema altindaki tum tablolari bosaltir (enums tablolari HARIC tutulur: FK hedefleri).
export async function truncateAll(schemaName = 'content', name = 'default') {
  const pool = getTestPool(name);
  const { rows } = await pool.query('SELECT tablename FROM pg_tables WHERE schemaname = $1', [schemaName]);
  if (rows.length) await pool.query(`TRUNCATE TABLE ${rows.map((r) => `"${schemaName}"."${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export async function closeAllPools() {
  for (const [name, pool] of Object.entries(pools)) {
    await pool.end();
    delete pools[name];
  }
}
