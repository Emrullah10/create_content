// core/service-content/src/infrastructure/persistence/schemas/table-definitions.js (tek gercek kaynak)
// ile db-schemas/*.sql dosyalarinin senkron oldugunu dogrular.
// Uyusmazlik varsa build FAIL eder — SQL'in elle guncellenmesi gerektigini hatirlatir (bkz CLAUDE.md).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tables } from '../core/service-content/src/infrastructure/persistence/schemas/table-definitions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemasDir = path.join(__dirname, '..', 'db-schemas');

const sqlFiles = readdirSync(schemasDir).filter((f) => f.endsWith('.sql'));
const combinedSql = sqlFiles
  .sort()
  .map((f) => readFileSync(path.join(schemasDir, f), 'utf-8'))
  .join('\n\n');

let missing = [];
for (const [tableName, def] of Object.entries(tables)) {
  if (!combinedSql.includes(`CREATE TABLE ${tableName}`)) {
    missing.push(tableName);
    continue;
  }
  for (const col of def.columns) {
    if (!new RegExp(`\\b${col}\\b`).test(combinedSql)) {
      missing.push(`${tableName}.${col}`);
    }
  }
}

if (missing.length) {
  console.error('[build-schema] SQL <-> table-definitions.js senkron degil, eksik:', missing);
  process.exit(1);
}

console.log(`[build-schema] OK — ${Object.keys(tables).length} tablo, ${sqlFiles.length} SQL dosyasi senkron.`);
