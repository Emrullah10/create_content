#!/usr/bin/env node
// Migration runner. Defter: public.schema_migrations(version, checksum, applied_at, applied_by, baselined).
// Her dosya en fazla bir kez uygulanir; defter kaydi migration ile AYNI transaction'da yazilir.
// Komutlar: --status | --pending | --baseline --yes | <dosya>... | --all-since <YYYY-MM-DD>
// Baglanti sirasi: MIGRATION_DB_CONNECTION_STRING -> CORE_APP_DB_CONNECTION_STRING -> kokteki .env
// Uygulanmis migration DUZENLENMEZ; checksum degisirse "drift" olarak raporlanir.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIG_DIR = join(ROOT, 'db-schemas', 'migrations');
const CORE_SCHEMAS = ['content', 'enums'];
const collator = new Intl.Collator('en', { numeric: true });

const loadEnv = () => {
  const f = join(ROOT, '.env');
  if (existsSync(f)) for (const [k, v] of Object.entries(dotenv.parse(readFileSync(f)))) if (!(k in process.env)) process.env[k] = v;
};
loadEnv();
const conn = (process.env.MIGRATION_DB_CONNECTION_STRING || process.env.CORE_APP_DB_CONNECTION_STRING || '').trim();
if (!conn) {
  console.error('HATA: MIGRATION_DB_CONNECTION_STRING veya CORE_APP_DB_CONNECTION_STRING tanimli degil.');
  process.exit(1);
}

const sha = (text) => createHash('sha256').update(text).digest('hex');
const listFiles = () =>
  existsSync(MIG_DIR) ? readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort(collator.compare) : [];
const read = (f) => readFileSync(join(MIG_DIR, f), 'utf8');

const client = new pg.Client({ connectionString: conn });
await client.connect();
const who = (await client.query('select current_user u')).rows[0].u;

await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY, checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), applied_by TEXT NOT NULL, baselined BOOLEAN NOT NULL DEFAULT FALSE)`);

const ledger = new Map((await client.query('select version, checksum, baselined from public.schema_migrations')).rows.map((r) => [r.version, r]));
const files = listFiles();
const drift = files.filter((f) => ledger.has(f) && !ledger.get(f).baselined && ledger.get(f).checksum !== sha(read(f)));
const pending = files.filter((f) => !ledger.has(f));

const status = () => {
  console.log(`Uygulanmis: ${files.length - pending.length} | Bekleyen: ${pending.length} | Drift: ${drift.length}`);
  for (const f of pending) console.log(`  [bekliyor] ${f}`);
  for (const f of drift) console.log(`  [DRIFT]    ${f} (uygulandiktan sonra degistirilmis)`);
};

const apply = async (file) => {
  const text = read(file);
  try {
    await client.query('BEGIN');
    await client.query(text);
    await client.query('INSERT INTO public.schema_migrations (version, checksum, applied_by) VALUES ($1,$2,$3)', [file, sha(text), who]);
    await client.query('COMMIT');
    console.log(`  uygulandi: ${file}`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error(`${file}: ${e.message}`);
  }
};

const args = process.argv.slice(2);
try {
  if (args.includes('--status')) {
    status();
  } else if (args.includes('--baseline')) {
    if (!args.includes('--yes')) throw new Error('--baseline diskteki TUM dosyalari CALISTIRMADAN "uygulandi" isaretler. Onaylamak icin --yes ekle.');
    const have = (await client.query('select count(*)::int n from information_schema.schemata where schema_name = any($1)', [CORE_SCHEMAS])).rows[0].n;
    if (have === 0) throw new Error(`Veritabani bos gorunuyor (${CORE_SCHEMAS.join(', ')} yok); once _combined.sql'i uygula.`);
    for (const f of pending) {
      await client.query('INSERT INTO public.schema_migrations (version, checksum, applied_by, baselined) VALUES ($1,$2,$3,TRUE)', [f, sha(read(f)), who]);
      console.log(`  baseline: ${f}`);
    }
    console.log(`${pending.length} dosya baseline olarak isaretlendi. Sonucu defterden degil semadan dogrula.`);
  } else if (args.includes('--pending')) {
    if (drift.length) console.warn(`UYARI: ${drift.length} drift'li dosya var (--status).`);
    for (const f of pending) await apply(f);
    console.log(pending.length ? `${pending.length} migration uygulandi.` : 'Bekleyen migration yok.');
  } else if (args.includes('--all-since')) {
    const since = args[args.indexOf('--all-since') + 1];
    for (const f of pending.filter((x) => x.slice(0, 10) >= since)) await apply(f);
  } else if (args.length) {
    for (const name of args) {
      const f = name.endsWith('.sql') ? name : `${name}.sql`;
      if (!files.includes(f)) throw new Error(`Dosya yok: ${f}`);
      if (ledger.has(f)) { console.log(`  zaten uygulanmis: ${f}`); continue; }
      await apply(f);
    }
  } else {
    console.log('Kullanim: --status | --pending | --baseline --yes | <dosya>... | --all-since <tarih>');
  }
} catch (e) {
  console.error(`HATA: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
