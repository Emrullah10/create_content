import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// .env.test varsa onu, yoksa kokteki .env'den baglanti bilgisini turetir (TEST_DB_* bos kalirsa).
export const loadTestEnv = () => {
  const file = path.resolve('.env.test');
  if (existsSync(file)) dotenv.config({ path: file, quiet: true });
  if (!process.env.TEST_DB_HOST && !process.env.TEST_DB_USER) {
    dotenv.config({ path: path.resolve('.env'), quiet: true });
    const conn = process.env.CORE_APP_DB_CONNECTION_STRING;
    if (conn) {
      const u = new URL(conn);
      process.env.TEST_DB_HOST ||= u.hostname;
      process.env.TEST_DB_PORT ||= u.port || '5432';
      process.env.TEST_DB_USER ||= decodeURIComponent(u.username);
      process.env.TEST_DB_PASSWORD ||= decodeURIComponent(u.password);
    }
  }
  process.env.TEST_DB_BASE_NAME ||= 'create_content_test';
  return {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    user: process.env.TEST_DB_USER || process.env.USER,
    password: process.env.TEST_DB_PASSWORD || '',
    base: process.env.TEST_DB_BASE_NAME,
  };
};

export const workerDbNames = (base, maxWorkers) =>
  Array.from({ length: Math.max(1, Number(maxWorkers) || 1) }, (_, i) => `${base}_${i + 1}`);
