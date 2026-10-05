import container from '../../container.js';

export const themeCreateHandler = (req, caller) => container.useCases.theme.create({ ...req.body, caller });

export const themeUpdateHandler = (req, caller) =>
  container.useCases.theme.update({ ...req.body, themeCode: req.params?.themeCode, caller });

export const themeToggleHandler = (req, caller) =>
  container.useCases.theme.toggle({ themeCode: req.params?.themeCode, isActive: req.body?.isActive, caller });
