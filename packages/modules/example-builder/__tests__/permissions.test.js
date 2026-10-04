import { describe, test, expect } from '@jest/globals';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyDefaultPermissions, UNSCOPED_READ_SCHEMAS } from '../index.js';

const col = (camelCase, extra = {}) => ({ original: camelCase, camelCase, ...extra });
const table = (schemaName, columns, permissions) => ({
  table: { schemaName, tableName: 't', ...(permissions ? { permissions } : {}) },
  t: columns,
});

describe('applyDefaultPermissions', () => {
  test('content şeması varsayılanı: content:read, yazma kapalı', () => {
    const out = applyDefaultPermissions({ t: table('content', { tTitle: col('tTitle') }) });
    expect(out.t.table.permissions).toEqual({ read: 'content:read', write: false });
  });

  test('enums herkese okunabilir', () => {
    const out = applyDefaultPermissions({ t: table('enums', { tName: col('tName') }) });
    expect(out.t.table.permissions).toEqual({ read: '*', write: false });
  });

  test('bilinmeyen şema açılışı düşürür', () => {
    expect(() => applyDefaultPermissions({ t: table('identity', {}) })).toThrow(/unknown schema/);
  });

  test('kapsamsız şemalar: enums ve content', () => {
    expect([...UNSCOPED_READ_SCHEMAS].sort()).toEqual(['content', 'enums']);
  });

  test('açık permissions tanımı olduğu gibi korunur', () => {
    const permissions = { read: 'content:read', write: false };
    const out = applyDefaultPermissions({ t: table('content', { tName: col('tName') }, permissions) });
    expect(out.t.table.permissions).toBe(permissions);
  });
});

// ── KORUMA TESTLERİ: TÜM CORE TABLOLARI ────────────────────────────────────
// (1) Tek kullanıcılı tasarımda tenant/organization kolonu OLMAMALI. Olursa query-builder'ın
//     'none' sentineli o kolonda kapsam filtresini sessizce atlar.
// (2) Sır gibi görünen kolon `sensitive: true` olmalı ya da tablonun okuması kapalı olmalı.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SECRET_COLUMN = /(_password|password_hash|_token$|secret|api_key)/;
const SCOPE_COLUMN = /(tenantcode|organizationid)$/i;

const loadCoreTables = async () => {
  const coreDir = join(repoRoot, 'core');
  const tables = [];
  if (!existsSync(coreDir)) return tables;
  for (const svc of readdirSync(coreDir)) {
    const file = join(coreDir, svc, 'src/infrastructure/persistence/schemas/table-definitions.js');
    if (!existsSync(file)) continue;
    const defs = (await import(pathToFileURL(file).href)).default;
    for (const [key, schema] of Object.entries(defs)) {
      if (schema?.table) tables.push({ svc, key, schema, columns: Object.values(schema[key] || {}) });
    }
  }
  return tables;
};

describe('core tabloları: koruma testleri', () => {
  test('hiçbir kolon tenant/organization kapsam kolonu değildir', async () => {
    const offenders = [];
    for (const { svc, key, columns } of await loadCoreTables()) {
      for (const c of columns) if (SCOPE_COLUMN.test(c.camelCase)) offenders.push(`${svc}.${key}.${c.camelCase}`);
    }
    expect(offenders).toEqual([]);
  });

  test('sır gibi görünen kolonlar sensitive ya da tablo okuması kapalı', async () => {
    const offenders = [];
    for (const { svc, key, schema, columns } of await loadCoreTables()) {
      if (schema.table.permissions?.read === false) continue;
      for (const c of columns) {
        if (SECRET_COLUMN.test(c.original) && !c.sensitive) offenders.push(`${svc}.${key}.${c.original}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
