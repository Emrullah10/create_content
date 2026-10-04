import { describe, test, expect, afterEach } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvFile } from '../index.js';

// Acikca verilmis ortam degiskeni (kabuk, pm2, test) .env'i EZER; .env yalniz TANIMSIZ olanlari doldurur.
// Eskiden her anahtar eziliyordu: `GITHUB_TOKEN= npm start` gibi gecici bir kapatma sessizce yok sayiliyordu.
describe('loadEnvFile önceliği', () => {
  const KEYS = ['CC_T_SET', 'CC_T_EMPTY', 'CC_T_UNSET'];
  afterEach(() => KEYS.forEach((k) => delete process.env[k]));

  test('ortam > .env; boş string de kazanır; tanımsız olan .env\'den dolar', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'cc-env-')), '.env');
    writeFileSync(file, 'CC_T_SET=from-file\nCC_T_EMPTY=from-file\nCC_T_UNSET=from-file\n');
    process.env.CC_T_SET = 'from-shell';
    process.env.CC_T_EMPTY = '';
    loadEnvFile(file);
    expect(process.env.CC_T_SET).toBe('from-shell');
    expect(process.env.CC_T_EMPTY).toBe('');
    expect(process.env.CC_T_UNSET).toBe('from-file');
  });

  test('dosya yoksa sessizce geçer', () => {
    expect(() => loadEnvFile('/nonexistent/.env')).not.toThrow();
  });
});
