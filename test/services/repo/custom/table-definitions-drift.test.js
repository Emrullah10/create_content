import { describe, test, expect, afterAll } from '@jest/globals';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getTestPool, closeAllPools } from '../../../config/db-client.js';

afterAll(closeAllPools);

// SQL'e kolon eklenmiş ama table-definitions'a eklenmemişse (ya da tersi) query-builder `_NOT_FOUND` / Postgres 42703 verir.
// Test DB db-schemas/*.sql'den kurulur; bu test SQL ile table-definitions.js'in senkron olduğunu kilitler.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

const loadCoreColumns = async () => {
  const set = new Set();
  const coreDir = join(repoRoot, 'core');
  for (const svc of readdirSync(coreDir)) {
    const file = join(coreDir, svc, 'src/infrastructure/persistence/schemas/table-definitions.js');
    if (!existsSync(file)) continue;
    const defs = (await import(pathToFileURL(file).href)).default;
    for (const [key, schema] of Object.entries(defs)) {
      if (!schema?.table) continue;
      for (const col of Object.values(schema[key])) set.add(`${schema.table.schemaName}.${schema.table.tableName}.${col.original}`);
    }
  }
  return set;
};

describe('table-definitions ↔ information_schema', () => {
  test('her iki yönde birebir aynı kolon kümesi', async () => {
    const { rows } = await getTestPool().query(
      `SELECT table_schema || '.' || table_name || '.' || column_name AS id FROM information_schema.columns WHERE table_schema IN ('content','enums')`,
    );
    const db = new Set(rows.map((r) => r.id));
    const defs = await loadCoreColumns();
    expect([...defs].filter((x) => !db.has(x))).toEqual([]); // table-definitions'ta var, DB'de yok
    expect([...db].filter((x) => !defs.has(x))).toEqual([]); // DB'de var, table-definitions'ta yok
  });
});
