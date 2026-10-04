import { NotFoundError } from '../../../domain/errors/index.js';

const ALLOWED_FIELDS = ['name', 'description', 'targetAudience', 'expertiseNotes', 'weight'];

export const makeUpdateTheme = ({ themeRepo }) => async ({ themeId, patch }) => {
  const theme = await themeRepo.findById(themeId);
  if (!theme) throw new NotFoundError('Theme', themeId);

  const safePatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => ALLOWED_FIELDS.includes(key)),
  );
  return themeRepo.update(themeId, safePatch);
};
