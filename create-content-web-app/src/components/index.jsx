// Ortak bilesen kaydi: `import Components from '@components'; const { MuiButton } = Components;`
// Bir iki bilesen gerekiyorsa dogrudan import tercih edilir (ornek: '@components/MuiButton/MuiButton').
const modules = import.meta.glob('./*/*.jsx', { eager: true });

const registry = {};
for (const [path, mod] of Object.entries(modules)) {
  const name = path.split('/')[1];
  if (mod.default) registry[name] = mod.default;
}

export default registry;
