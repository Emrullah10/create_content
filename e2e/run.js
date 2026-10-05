// E2E kosucusu (Docker YOK): ayri DB kurar, servisi (sahte LLM/portlar) ve paneli baslatir, Playwright'i kosar, hepsini temizler.
// Dis etkisi olan kanallar KAPALI: LLM_PROVIDER=fake (LLM, arastirma, gorsel, GitHub, dev.to hep sahte). Gercek anahtarlar kullanilmaz.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { loadTestEnv } from '../test/config/test-env.js';
import { schemaFiles, readSchemaFile } from '../scripts/lib/schema-files.mjs';
import { E2E } from './helpers/env.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
const cfg = loadTestEnv();
const children = [];

const adminClient = async (database = 'postgres') => {
  const c = new pg.Client({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database });
  await c.connect();
  return c;
};
const dropDb = async () => {
  const admin = await adminClient();
  await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND usename = current_user AND pid <> pg_backend_pid()', [E2E.dbName]);
  await admin.query(`DROP DATABASE IF EXISTS "${E2E.dbName}"`);
  await admin.end();
};
const waitFor = async (url, label, timeoutMs = 60_000) => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* henuz ayakta degil: beklenen */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} hazir olmadi: ${url}`);
};
const start = (name, cmd, args, opts) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true, ...opts });
  child.stdout.on('data', (d) => process.env.E2E_VERBOSE && process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.env.E2E_VERBOSE && process.stderr.write(`[${name}] ${d}`));
  children.push(child);
  return child;
};
const stopAll = () => {
  for (const c of children) {
    try {
      process.kill(-c.pid, 'SIGTERM');
    } catch {
      /* zaten kapanmis */
    }
  }
};

let exitCode = 1;
try {
  // Porta zaten biri oturuyorsa sessizce eski/yanlis surecle konusma: dur.
  for (const port of [E2E.servicePort, E2E.panelPort]) {
    if (spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' }).stdout.trim()) throw new Error(`port ${port} dolu (lsof -nP -iTCP:${port} -sTCP:LISTEN)`);
  }
  await dropDb();
  const admin = await adminClient();
  await admin.query(`CREATE DATABASE "${E2E.dbName}"`);
  await admin.end();
  const db = await adminClient(E2E.dbName);
  await db.query(schemaFiles({ includeSeed: false }).map(readSchemaFile).join('\n;\n'));
  await db.end();

  const conn = `postgres://${encodeURIComponent(cfg.user)}:${encodeURIComponent(cfg.password)}@${cfg.host}:${cfg.port}/${E2E.dbName}`;
  const serviceEnv = {
    ...process.env,
    NODE_ENV: 'development',
    SERVICE_CONTENT_REST_URL: E2E.serviceUrl,
    CORE_APP_DB_CONNECTION_STRING: conn,
    PANEL_ORIGINS: E2E.panelUrl,
    LLM_PROVIDER: 'fake',
    DISABLE_CRON: 'true',
    GITHUB_TOKEN: '',
    DEVTO_API_KEY: '',
  };
  start('service', process.execPath, ['main.js'], { cwd: path.join(ROOT, 'services/create-content-service-content'), env: serviceEnv });
  start('panel', process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js')], { cwd: path.join(ROOT, 'create-content-web-app'), env: { ...process.env, VITE_PORT: String(E2E.panelPort), VITE_PROXY_TARGET: E2E.serviceUrl } });
  await waitFor(`${E2E.serviceUrl}/api/online`, 'servis');
  await waitFor(`${E2E.panelUrl}/`, 'panel');

  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/@playwright/test/cli.js'), 'test', '--config', 'e2e/playwright.config.js', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
  exitCode = r.status ?? 1;
} catch (error) {
  console.error(`✗ ${error.message}`);
} finally {
  stopAll();
  await new Promise((r) => setTimeout(r, 1500));
  await dropDb().catch((e) => console.error('db temizlenemedi:', e.message));
}
process.exit(exitCode);
