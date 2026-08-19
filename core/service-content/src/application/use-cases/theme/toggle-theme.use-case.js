import { NotFoundError } from '../../../domain/errors/index.js';

export const makeToggleTheme = ({ themeRepo }) => async ({ themeId, isActive }) => {
  const theme = await themeRepo.findById(themeId);
  if (!theme) throw new NotFoundError('Theme', themeId);
  return themeRepo.update(themeId, { isActive });
};
