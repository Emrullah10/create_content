import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'prompts');
const cache = new Map();
const VAR = /\{\{([a-z][a-z0-9_]*)\}\}/g;

export const loadPrompt = (name) => {
  if (!cache.has(name)) cache.set(name, readFileSync(join(DIR, `${name}.md`), 'utf8').trim());
  return cache.get(name);
};

export const promptVariables = (name) => [...new Set([...loadPrompt(name).matchAll(VAR)].map((m) => m[1]))];

// Eksik degisken HATA verir: bos kalan bir {{x}} modele oldugu gibi gitmesin. Degerler tek gecista yerlestirilir
// (degerin icindeki "{{...}}" ikinci kez yorumlanmaz).
export const renderPrompt = (name, vars) => {
  const missing = promptVariables(name).filter((v) => vars[v] === undefined || vars[v] === null);
  if (missing.length) throw new Error(`prompt "${name}" is missing variables: ${missing.join(', ')}`);
  return loadPrompt(name).replace(VAR, (_, v) => String(vars[v]));
};
