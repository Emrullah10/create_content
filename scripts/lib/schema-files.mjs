// db-schemas altindaki taban SQL dosyalari: build-schema.js ve test db-setup.js ayni kurali paylasir.
// Girmeyenler: migrations/, "A" ile baslayanlar (elle/superuser), _combined.sql.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db-schemas');
// Sabit karsilastirma: host locale'i sirayi degistirmesin.
const collator = new Intl.Collator('en', { numeric: true });

export const schemaFiles = ({ includeSeed = true } = {}) =>
  readdirSync(SCHEMA_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.sql') && !d.name.startsWith('A') && d.name !== '_combined.sql')
    .map((d) => d.name)
    .filter((n) => includeSeed || !/seed/i.test(n))
    .sort(collator.compare);

export const readSchemaFile = (name) => readFileSync(join(SCHEMA_DIR, name), 'utf8');
