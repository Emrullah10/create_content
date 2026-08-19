export const makeCreateTheme = ({ themeRepo }) => async (input) => {
  return themeRepo.create(input);
};
