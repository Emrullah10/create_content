import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';

export const makeToggleTheme = ({ themeRepo, nowFn = () => new Date() } = {}) => {
  if (!themeRepo) throw new Error('makeToggleTheme requires { themeRepo }');
  return async ({ caller, themeCode, isActive } = {}) => {
    requireCallerPermission(caller, PERMISSIONS.contentManage);
    if (!themeCode) throw new DomainError('THEME_CODE_REQUIRED', 'themeCode is required');
    if (typeof isActive !== 'boolean') throw new DomainError('THEME_IS_ACTIVE_REQUIRED', 'isActive (boolean) is required');
    const row = await themeRepo.update({ themeCode, patch: { isActive }, userId: caller.callerUserId, now: nowFn() });
    if (!row) throw new DomainError('THEME_NOT_FOUND', 'theme not found');
    return row;
  };
};
