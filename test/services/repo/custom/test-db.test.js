import { describe, test, expect, afterAll } from '@jest/globals';
import { getTestPool, closeAllPools } from '../../../config/db-client.js';
import { schemaFiles } from '../../../../scripts/lib/schema-files.mjs';

afterAll(closeAllPools);

describe('test veritabanı altyapısı', () => {
  test('worker DB kurulu: content ve enums şemaları var, enum satırları yüklü', async () => {
    const pool = getTestPool();
    const { rows } = await pool.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema IN ('content','enums')");
    expect(rows[0].n).toBe(22);
    expect((await pool.query('SELECT count(*)::int n FROM enums.article_status')).rows[0].n).toBe(7);
  });

  // Diger test dosyalari ayni worker DB'sini kullanir ve veri birakabilir; bu yuzden "tablo bos" varsayilmaz,
  // seed dosyasinin kurulumdan DISLANDIGI dogrudan dogrulanir.
  test('seed dosyası test DB kurulumuna girmez ama taban dosyalar girer', () => {
    expect(schemaFiles({ includeSeed: false }).some((f) => /seed/i.test(f))).toBe(false);
    expect(schemaFiles({ includeSeed: false })).toEqual(expect.arrayContaining(['00-enums-schema.sql', '01-content-schema.sql']));
    expect(schemaFiles().some((f) => /seed/i.test(f))).toBe(true);
    expect(schemaFiles().every((f) => !f.startsWith('A'))).toBe(true);
  });

  test('worker başına ayrı DB kullanılır', () => {
    expect(process.env.TEST_DB_NAME).toMatch(/^create_content_test_\d+$/);
  });
});
