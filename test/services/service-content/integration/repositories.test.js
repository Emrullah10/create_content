import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { initQueryBuilder } from 'app-query-builder';
import repositoryImpls from '../../../../core/service-content/src/infrastructure/persistence/repositories/index.js';
import tableDefs from '../../../../core/service-content/src/infrastructure/persistence/schemas/table-definitions.js';
import { OPERATOR_CALLER } from 'app-shared';
import { bootServiceTest, shutdownServiceTest } from '../helpers/boot.js';

// ÜRETİLEN-STİL: her tablo için repo.read({}, caller) SQL'i gerçekten koşuyor mu. Düzenlenmez.
const entries = Object.entries(tableDefs).filter(([, s]) => s?.table);

beforeAll(async () => {
  initQueryBuilder(tableDefs);
  await bootServiceTest();
});
afterAll(shutdownServiceTest);

describe.each(entries)('%s repository (integration)', (name) => {
  test('read({}, caller) returns an array or null', async () => {
    const result = await repositoryImpls[name].read({}, OPERATOR_CALLER);
    expect(Array.isArray(result) || result === null).toBe(true);
  });
});
