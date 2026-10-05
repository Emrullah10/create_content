import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tr from '../locales/tr.js';
import en from '../locales/en.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '../../..');
const REPO = join(SRC, '../..');

const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? (f === '__tests__' || f === 'locales' ? [] : walk(join(dir, f))) : /\.(jsx?|js)$/.test(f) ? [join(dir, f)] : []));
const trKeys = new Set(flatten(tr));
const enKeys = new Set(flatten(en));

describe('çeviri dosyaları', () => {
  test('tr ve en anahtar kümesi BİREBİR aynı', () => {
    expect([...trKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !trKeys.has(k))).toEqual([]);
  });

  test('boş çeviri yok', () => {
    const empty = (obj, p = '') => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? empty(v, `${p}${k}.`) : String(v).trim() ? [] : [`${p}${k}`]));
    expect([...empty(tr), ...empty(en)]).toEqual([]);
  });

  test('Türkçe metinler Türkçe karakter içerir (ASCII’ye indirgenmemiş)', () => {
    const sample = [tr.dashboard.title, tr.articles.subtitle, tr.themes.notesHint, tr.status.needs_assets].join(' ');
    expect(sample).toMatch(/[ığüşöçİĞÜŞÖÇ]/);
  });

  test('kodda geçen HER statik anahtar iki dilde de var', () => {
    const NS = ['app', 'nav', 'common', 'dashboard', 'themes', 'topics', 'articles', 'publishing', 'publications', 'report', 'sources', 'pipeline', 'status', 'apiErrors'];
    const re = new RegExp(`['"\`]((?:${NS.join('|')})(?:\\.[A-Za-z0-9_-]+)+)['"\`]`, 'g');
    const missing = [];
    for (const file of walk(SRC)) {
      for (const m of readFileSync(file, 'utf8').matchAll(re)) if (!trKeys.has(m[1]) || !enKeys.has(m[1])) missing.push(`${m[1]} (${file.replace(SRC, '')})`);
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  test('dinamik anahtarlar: durum etiketleri, kriterler, kontrol kimlikleri', () => {
    const quality = readFileSync(join(REPO, 'services/create-content-service-content/src/domain/article/quality-checks.js'), 'utf8');
    const checkIds = [...quality.matchAll(/\{ id: '([a-z-]+)'/g)].map((m) => m[1]);
    expect(checkIds.length).toBeGreaterThanOrEqual(10);
    for (const id of checkIds) expect(trKeys.has(`report.check.${id}`)).toBe(true);
    for (const c of ['technical_depth', 'structural_richness', 'clarity', 'originality']) expect(trKeys.has(`report.criteria.${c}`)).toBe(true);
    // Veritabani enum degerleri (db-schemas) -> status.*
    const sql = readFileSync(join(REPO, 'db-schemas/00-enums-schema.sql'), 'utf8');
    for (const table of ['topic_status', 'article_status', 'publication_status', 'job_status']) {
      const block = sql.slice(sql.indexOf(`INSERT INTO enums.${table}`), sql.indexOf(';', sql.indexOf(`INSERT INTO enums.${table}`)));
      for (const m of block.matchAll(/\('([a-z_]+)'/g)) expect(trKeys.has(`status.${m[1]}`)).toBe(true);
    }
  });

  test('backend’in döndürebileceği HER hata kodunun apiErrors çevirisi var (şablon §8.11)', () => {
    const map = readFileSync(join(REPO, 'services/create-content-service-content/src/interfaces/http/translate-domain-error.js'), 'utf8');
    const codes = [...map.matchAll(/^\s+([A-Z][A-Z0-9_]+):\s+\w+,/gm)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(30);
    const adapter = ['LLM_TRUNCATED', 'LLM_INVALID_JSON', 'LLM_EMPTY_RESPONSE', 'VALIDATION_ERROR', 'NOT_FOUND', 'ALREADY_EXISTS', 'REFERENCE_NOT_FOUND', 'HOST_NOT_ALLOWED', 'ORIGIN_NOT_ALLOWED', 'UNAUTHENTICATED', 'PERMISSION_DENIED'];
    const missing = [...codes, ...adapter].filter((c) => !trKeys.has(`apiErrors.${c}`) || !enKeys.has(`apiErrors.${c}`));
    expect(missing).toEqual([]);
  });

  test('api modüllerinde fonksiyon adı çakışması yok', () => {
    const dir = join(SRC, 'api');
    const names = readdirSync(dir).filter((f) => f.endsWith('.js')).flatMap((f) => [...readFileSync(join(dir, f), 'utf8').matchAll(/^\s{2}([a-zA-Z]+):\s*\(/gm)].map((m) => m[1]));
    expect(names.length).toBeGreaterThan(15);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });
});
