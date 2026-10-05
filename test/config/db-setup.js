import { createHash } from 'crypto';
import pg from 'pg';
import { loadTestEnv, workerDbNames } from './test-env.js';
import { schemaFiles, readSchemaFile } from '../../scripts/lib/schema-files.mjs';

// Test DB'leri dogrudan db-schemas/*.sql'den (seed HARIC) kurulur: yerel PG, tek sorgu, ~100 ms/DB.
// Sema parmak izi (sha1) DB'de saklanir: TEST_REUSE_DB=1 yalniz parmak izi AYNIYSA yeniden kullanir,
// degistiyse yeniden kurar. Yani "bayat sema ile yesil test" mumkun degildir.
// Worker basina ayri DB: <base>_<JEST_WORKER_ID> (paylasilan tek DB paralel kosuda deadlock uretir).
const FP_TABLE = 'public._test_schema_fp';

const buildSql = () => schemaFiles({ includeSeed: false }).map(readSchemaFile).join('\n;\n');
const connect = async (cfg, database) => {
  const client = new pg.Client({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database, connectionTimeoutMillis: 10_000 });
  await client.connect();
  return client;
};

export default async function setup(globalConfig) {
  const cfg = loadTestEnv();
  const sql = buildSql();
  const fp = createHash('sha1').update(sql).digest('hex');
  const dbs = workerDbNames(cfg.base, globalConfig?.maxWorkers);
  const reuse = process.env.TEST_REUSE_DB === '1' && process.env.TEST_DB_REFRESH !== '1';

  const admin = await connect(cfg, 'postgres');
  try {
    await admin.query('SET lock_timeout = 15000');
    for (const db of dbs) {
      const exists = (await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [db])).rowCount > 0;
      if (exists && reuse) {
        const probe = await connect(cfg, db);
        const stored = await probe.query(`SELECT fp FROM ${FP_TABLE}`).then((r) => r.rows[0]?.fp, () => null);
        await probe.end();
        if (stored === fp) continue;
        console.log(`[test-setup] ${db}: sema degismis, yeniden kuruluyor`);
      }
      await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND usename = current_user AND pid <> pg_backend_pid()', [db]);
      await admin.query(`DROP DATABASE IF EXISTS "${db}"`);
      await admin.query(`CREATE DATABASE "${db}"`);
      const client = await connect(cfg, db);
      try {
        await client.query(sql);
        await client.query(`CREATE TABLE ${FP_TABLE} (fp TEXT NOT NULL)`);
        await client.query(`INSERT INTO ${FP_TABLE} VALUES ($1)`, [fp]);
      } finally {
        await client.end();
      }
    }
    console.log(`[test-setup] ${dbs.length} worker DB hazir (${reuse ? 'yeniden kullanim' : 'taze kurulum'}): ${dbs.join(', ')}`);
  } finally {
    await admin.end();
  }
}
