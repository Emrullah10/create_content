import { describe, test, expect } from '@jest/globals';
import { buildContainer } from '../../../../../services/create-content-service-content/src/container.js';

// ⚠️ Yalnız *Raw'a eklenen use-case donduruldmus haritada olmaz ve handler'dan "is not a function" verir
// (çoğu zaman bir catch tarafından sessizce yutulur). Factory'yi doğrudan import eden birim testleri bunu görmez.
describe('container kablolaması', () => {
  const container = buildContainer({ rawQueryFn: async () => ({ rows: [] }) });

  test('harita dondurulmuş', () => {
    expect(Object.isFrozen(container)).toBe(true);
    expect(Object.isFrozen(container.useCases)).toBe(true);
  });

  describe.each(Object.entries(container.useCases))('%s', (aggregate, map) => {
    test('her ham use-case, sarılmış haritada fonksiyon olarak var', () => {
      expect(Object.isFrozen(map)).toBe(true);
      for (const name of Object.keys(map.raw)) expect(typeof map[name]).toBe('function');
    });
  });

  test('translateHttpErrors:false saf DomainError görür', async () => {
    const raw = buildContainer({ rawQueryFn: async () => ({ rows: [] }), translateHttpErrors: false });
    await expect(raw.useCases.theme.create({ caller: { callerUserId: '1', callerPermissionList: ['content:manage'] }, name: '' })).rejects.toMatchObject({ name: 'DomainError', code: 'THEME_NAME_REQUIRED' });
  });
});
