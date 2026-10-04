#!/usr/bin/env node
// Her LLM rolunu (writer/judge/utility) 1-5 token'lik bir istekle dener; gercekten ERISILEBILIR mi, ne kadar surede
// yanit veriyor gosterir. Hesapta "gorunen ama not found donen" modeller boylece elenir. Ayrica Ollama kuruluysa modelleri listeler.
// Kullanim: npm run check:llm
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(ROOT, '.env'))) for (const [k, v] of Object.entries(dotenv.parse(readFileSync(join(ROOT, '.env'))))) if (!(k in process.env)) process.env[k] = v;

const { readRolesFromEnv } = await import('../services/create-content-service-content/src/infrastructure/llm/install-from-env.js');
const roles = readRolesFromEnv(process.env);
const PLACEHOLDER = /^(your-|changeme|<)/i;

const probe = async (role, cfg) => {
  if (!cfg.baseUrl || !cfg.model || !cfg.apiKey || PLACEHOLDER.test(cfg.apiKey)) return { role, ok: false, detail: 'not configured (set LLM_WRITER_BASE_URL / _API_KEY / _MODEL in .env)' };
  const started = Date.now();
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, max_tokens: 5, temperature: 0, messages: [{ role: 'user', content: 'Reply with the single word: ok' }] }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.text();
    if (!res.ok) return { role, ok: false, detail: `HTTP ${res.status}: ${body.slice(0, 160)}` };
    const reply = JSON.parse(body).choices?.[0]?.message?.content?.trim() ?? '';
    return { role, ok: true, detail: `${Date.now() - started} ms, replied "${reply.slice(0, 30)}"` };
  } catch (e) {
    return { role, ok: false, detail: e.cause?.code ? `${e.cause.code} (${cfg.baseUrl})` : e.message };
  }
};

console.log('LLM roles (from .env):');
let failed = 0;
for (const [role, cfg] of Object.entries(roles)) {
  const r = await probe(role, cfg);
  if (!r.ok) failed += 1;
  console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${role.padEnd(8)} ${cfg.model ?? '-'} @ ${cfg.baseUrl ?? '-'}\n         ${r.detail}`);
}

try {
  const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
  const tags = (await res.json()).models?.map((m) => m.name) ?? [];
  console.log(`\nOllama is running with ${tags.length} model(s): ${tags.join(', ') || '(none; try: ollama pull qwen3:8b)'}`);
} catch {
  console.log('\nOllama is not running on 127.0.0.1:11434 (optional: local "utility" role).');
}
process.exit(failed ? 1 : 0);
