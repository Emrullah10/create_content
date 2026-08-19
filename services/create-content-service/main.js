import { boot } from './src/boot.js';

boot().catch((err) => {
  console.error('[boot] fatal', err);
  process.exit(1);
});
