// dotenv/config, process.cwd()'e gore .env arar — servisler farkli dizinlerden
// baslatilabildigi icin (npm run --workspace= cwd'yi degistirir) bu guvenilmez.
// Bu dosya, kendi konumuna gore (packages/modules/config -> repo root) sabit bir
// yoldan repo kokundeki .env'i yukler; cwd ne olursa olsun calisir.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
