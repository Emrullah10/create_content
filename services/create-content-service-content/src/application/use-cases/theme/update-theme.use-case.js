import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { normalizeTags, validateThemeInput } from '../../../domain/theme/theme-rules.js';

const ALLOWED = ['name', 'description', 'tags', 'targetAudience', 'expertiseNotes', 'weight', 'isActive'];

export const makeUpdateTheme = ({ themeRepo, nowFn = () => new Date() } = {}) => {
  if (!themeRepo) throw new Error('makeUpdateTheme requires { themeRepo }');
  return async ({ caller, themeCode, ...body } = {}) => {
    requireCallerPermission(caller, PERMISSIONS.contentManage);
    if (!themeCode) throw new DomainError('THEME_CODE_REQUIRED', 'themeCode is required');
    const patch = Object.fromEntries(ALLOWED.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
    if (!Object.keys(patch).length) throw new DomainError('THEME_NOTHING_TO_UPDATE', 'no updatable field provided');
    validateThemeInput(patch, { partial: true });
    if (patch.tags !== undefined) patch.tags = normalizeTags(patch.tags);
    const row = await themeRepo.update({ themeCode, patch, userId: caller.callerUserId, now: nowFn() });
    if (!row) throw new DomainError('THEME_NOT_FOUND', 'theme not found');
    return row;
  };
};
