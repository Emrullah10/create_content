import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { normalizeTags, validateThemeInput } from '../../../domain/theme/theme-rules.js';

// Yeni icerik nisi. Uzmanlik notu (expertiseNotes) pipeline'in ozgunluk girdisidir.
export const makeCreateTheme = ({ themeRepo } = {}) => {
  if (!themeRepo) throw new Error('makeCreateTheme requires { themeRepo }');
  return async ({ caller, name, description, tags, targetAudience, expertiseNotes, weight } = {}) => {
    requireCallerPermission(caller, PERMISSIONS.contentManage);
    validateThemeInput({ name, weight });
    return themeRepo.insert({ name, description, tags: normalizeTags(tags), targetAudience, expertiseNotes, weight, userId: caller.callerUserId });
  };
};
