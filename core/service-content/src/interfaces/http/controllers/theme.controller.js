export const makeThemeController = ({ createTheme, listThemes, toggleTheme, updateTheme }) => ({
  create: (req) => createTheme(req.body),
  list: (req) => listThemes({ activeOnly: req.query.activeOnly === 'true' }),
  toggle: (req) => toggleTheme({ themeId: req.params.id, isActive: req.body.isActive }),
  update: (req) => updateTheme({ themeId: req.params.id, patch: req.body }),
});
