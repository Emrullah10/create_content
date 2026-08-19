// mermaid-renderer.js icin gerekli mermaid.min.js kaynagini lazy okur (import zincirini kirmasin diye).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let cached = null;

export const loadMermaidSource = () => {
  if (cached) return cached;
  const mermaidDistPath = require.resolve('mermaid/dist/mermaid.min.js');
  cached = readFileSync(mermaidDistPath, 'utf-8');
  return cached;
};
