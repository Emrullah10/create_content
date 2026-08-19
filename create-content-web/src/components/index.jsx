const modules = import.meta.glob('./**/*.jsx', { eager: true });

const Components = Object.fromEntries(
  Object.entries(modules)
    .filter(([path]) => path !== './index.jsx')
    .map(([path, mod]) => {
      const name = path.split('/').pop().replace('.jsx', '');
      return [name, mod.default];
    }),
);

export default Components;
