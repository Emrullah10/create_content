import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let cached = null;

// mermaid.min.js kaynagi lazy okunur (import zincirini kirmasin diye).
export const loadMermaidSource = () => {
  if (!cached) cached = readFileSync(require.resolve('mermaid/dist/mermaid.min.js'), 'utf-8');
  return cached;
};
