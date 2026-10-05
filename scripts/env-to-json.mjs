#!/usr/bin/env node
// Kullanim: node scripts/env-to-json.mjs <cikti.json> <env-dosyasi> [.env.example]
// Anahtar kumesi ENV DOSYASININ KENDISINDEN okunur (kabuk degiskenleri PATH/HOME JSON'a sizmaz). .env.example yalniz EKSIK anahtar
// uyarisi icindir; anahtarlari ornek dosyadan suzmek sessiz veri kaybi olurdu (kodda kullanilip ornekte olmayan anahtar PM2'ye ulasmazdi).
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import dotenv from 'dotenv';

const [out, envFile, example] = process.argv.slice(2);
if (!out || !envFile) {
  console.error('Kullanim: env-to-json.mjs <cikti.json> <env-dosyasi> [.env.example]');
  process.exit(1);
}
const env = dotenv.parse(readFileSync(envFile));
const exampleKeys = example ? Object.keys(dotenv.parse(readFileSync(example))) : [];
const missing = exampleKeys.filter((k) => !(k in env));
if (missing.length) console.warn(`UYARI: ${envFile} dosyasinda .env.example anahtarlari eksik: ${missing.join(', ')}`);
writeFileSync(out, JSON.stringify({ ...env, NODE_ENV: 'production' }, null, 2));
chmodSync(out, 0o600);
console.log(`${out} yazildi (${Object.keys(env).length} anahtar)`);
