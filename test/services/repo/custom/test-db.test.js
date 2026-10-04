import { describe, test, expect, afterAll } from '@jest/globals';
import { getTestPool, closeAllPools } from '../../../config/db-client.js';

afterAll(closeAllPools);

describe('test veritabanı altyapısı', () => {
  test('worker DB kurulu: content ve enums şemaları var, seed yok', async () => {
    const pool = getTestPool();
    const { rows } = await pool.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema IN ('content','enums')");
    expect(rows[0].n).toBe(22);
    expect((await pool.query('SELECT count(*)::int n FROM content.theme')).rows[0].n).toBe(0);
    expect((await pool.query('SELECT count(*)::int n FROM enums.article_status')).rows[0].n).toBe(7);
  });

  test('worker başına ayrı DB kullanılır', () => {
    expect(process.env.TEST_DB_NAME).toMatch(/^create_content_test_\d+$/);
  });
});
