// jest setupFiles: test modulu import EDILMEDEN once calisir. Worker N -> <base>_N veritabani.
import { loadTestEnv } from './test-env.js';

const cfg = loadTestEnv();
process.env.TEST_DB_NAME = `${cfg.base}_${process.env.JEST_WORKER_ID || '1'}`;
process.env.NODE_ENV = 'test';
process.env.SERVICE_CONTENT_REST_URL ||= 'http://127.0.0.1:3100';
// Dis etkisi olan kanallar testte KAPALI (NODE_ENV==='test' kontrolune guvenilmez).
process.env.LLM_PROVIDER = 'fake';
process.env.PUBLISHER_PROVIDER = 'fake';
