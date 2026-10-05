import { describe, test, expect, jest } from '@jest/globals';
import { makeCreateTheme } from '../../../../../services/create-content-service-content/src/application/use-cases/theme/create-theme.use-case.js';
import { makeUpdateTheme } from '../../../../../services/create-content-service-content/src/application/use-cases/theme/update-theme.use-case.js';
import { makeToggleTheme } from '../../../../../services/create-content-service-content/src/application/use-cases/theme/toggle-theme.use-case.js';

const caller = { callerUserId: '1', callerPermissionList: ['content:manage'] };
const noPerm = { callerUserId: '1', callerPermissionList: [] };
const anon = { callerUserId: 'none', callerPermissionList: ['content:manage'] };

describe('theme use-case\'leri', () => {
  test('create: izin yoksa PERMISSION_DENIED, anonim UNAUTHENTICATED', async () => {
    const create = makeCreateTheme({ themeRepo: { insert: jest.fn() } });
    await expect(create({ caller: noPerm, name: 'x' })).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(create({ caller: anon, name: 'x' })).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  test('create: etiketleri normalleştirir ve kullanıcıyı yazar', async () => {
    const insert = jest.fn(async (d) => d);
    await makeCreateTheme({ themeRepo: { insert } })({ caller, name: 'N', tags: 'A B, c' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ tags: ['ab', 'c'], userId: '1' }));
  });

  test('update: yalnız allow-list alanları geçer', async () => {
    const update = jest.fn(async () => ({ themeCode: '1' }));
    await makeUpdateTheme({ themeRepo: { update } })({ caller, themeCode: '1', name: 'N', 'theme_name = 1 --': 'x' });
    expect(update.mock.calls[0][0].patch).toEqual({ name: 'N' });
  });

  test('update: boş yama ve bulunamayan tema', async () => {
    const uc = makeUpdateTheme({ themeRepo: { update: async () => null } });
    await expect(uc({ caller, themeCode: '1' })).rejects.toMatchObject({ code: 'THEME_NOTHING_TO_UPDATE' });
    await expect(uc({ caller, themeCode: '1', name: 'N' })).rejects.toMatchObject({ code: 'THEME_NOT_FOUND' });
  });

  test('toggle: isActive boolean olmalı', async () => {
    const uc = makeToggleTheme({ themeRepo: { update: async () => ({}) } });
    await expect(uc({ caller, themeCode: '1', isActive: 'false' })).rejects.toMatchObject({ code: 'THEME_IS_ACTIVE_REQUIRED' });
  });
});
