#!/usr/bin/env node
// Calisan dev DB'nin information_schema'sindan core/service-content table-definitions.js uretir.
// Elle eklenmis bayraklari (sensitive, excludeFromCallerScope, table.permissions) KORUR, ezmez.
// Kolonlar camelCase adina gore alfabetik siralanir. Kullanim: npm run gen:table-defs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import prettier from 'prettier';
import _ from 'lodash';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'core/service-content/src/infrastructure/persistence/schemas/table-definitions.js');
const SCHEMAS = ['enums', 'content'];
const DB_NAME = 'create_content';
const PRESERVED_COLUMN_FLAGS = ['sensitive', 'excludeFromCallerScope'];

if (existsSync(join(ROOT, '.env'))) for (const [k, v] of Object.entries(dotenv.parse(readFileSync(join(ROOT, '.env'))))) if (!(k in process.env)) process.env[k] = v;
const conn = process.env.CORE_APP_DB_CONNECTION_STRING;
if (!conn) throw new Error('CORE_APP_DB_CONNECTION_STRING tanimli degil');

const previous = existsSync(OUT) ? (await import(`${pathToFileURL(OUT).href}?t=${Date.now()}`)).default : {};
const client = new pg.Client({ connectionString: conn });
await client.connect();

const cols = (
  await client.query(
    `SELECT table_schema, table_name, column_name, udt_name, data_type, character_maximum_length, is_nullable, is_identity, ordinal_position
       FROM information_schema.columns WHERE table_schema = ANY($1) ORDER BY table_schema, table_name, ordinal_position`,
    [SCHEMAS],
  )
).rows;
const cons = (
  await client.query(
    `SELECT tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_type, tc.constraint_name,
            ccu.table_schema AS f_schema, ccu.table_name AS f_table, ccu.column_name AS f_column,
            (SELECT count(*) FROM information_schema.key_column_usage k WHERE k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema) AS n
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
       LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND tc.constraint_type = 'FOREIGN KEY'
      WHERE tc.table_schema = ANY($1) AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE','FOREIGN KEY')`,
    [SCHEMAS],
  )
).rows;
await client.end();

const tables = {};
for (const c of cols) {
  const key = _.camelCase(c.table_name);
  const t = (tables[key] ??= {
    table: { dbName: DB_NAME, schemaName: c.table_schema, tableName: c.table_name, tableNameWithSchema: `${c.table_schema}.${c.table_name}` },
    [key]: {},
  });
  const camel = _.camelCase(c.column_name);
  const mine = cons.filter((k) => k.table_schema === c.table_schema && k.table_name === c.table_name && k.column_name === c.column_name);
  const fk = mine.find((k) => k.constraint_type === 'FOREIGN KEY');
  const column = {
    original: c.column_name,
    camelCase: camel,
    udtName: c.udt_name,
    dataType: c.data_type,
    characterMaximumLength: c.character_maximum_length,
    isIdentity: c.is_identity === 'YES',
    isNullable: c.is_nullable === 'YES',
    isPrimaryKey: mine.some((k) => k.constraint_type === 'PRIMARY KEY'),
    isForeignKey: Boolean(fk),
    ...(fk ? { foreignTableSchema: fk.f_schema, foreignTableName: fk.f_table, foreignColumnName: fk.f_column } : {}),
    isUnique: mine.some((k) => k.constraint_type === 'UNIQUE' && Number(k.n) === 1),
    isIndex: false,
  };
  const old = previous?.[key]?.[key]?.[camel];
  for (const flag of PRESERVED_COLUMN_FLAGS) if (old?.[flag] !== undefined) column[flag] = old[flag];
  t[key][camel] = column;
}
for (const [key, t] of Object.entries(tables)) {
  t[key] = Object.fromEntries(Object.entries(t[key]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  if (previous?.[key]?.table?.permissions) t.table.permissions = previous[key].table.permissions;
}
const names = Object.keys(tables).sort();
const body = [
  `import { applyDefaultPermissions } from 'example-builder';`,
  `// URETILDI: npm run gen:table-defs. Elle eklenen bayraklar (sensitive, excludeFromCallerScope, table.permissions) korunur.`,
  ...names.map((n) => `const ${n} = ${JSON.stringify(tables[n], null, 2)};`),
  `export default applyDefaultPermissions({ ${names.join(', ')} });`,
].join('\n\n');
writeFileSync(OUT, await prettier.format(body, { parser: 'babel', singleQuote: true }));
console.log(`table-definitions.js yazildi: ${names.length} tablo (${names.join(', ')})`);
