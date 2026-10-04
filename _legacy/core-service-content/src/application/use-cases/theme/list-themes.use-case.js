export const makeListThemes = ({ themeRepo }) => async ({ activeOnly = false } = {}) => {
  return themeRepo.list({ activeOnly });
};
