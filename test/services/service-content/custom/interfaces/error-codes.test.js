import { describe, test, expect } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CODE_TO_FACTORY, toHttpError } from '../../../../../services/create-content-service-content/src/interfaces/http/translate-domain-error.js';
import { DomainError } from '../../../../../services/create-content-service-content/src/domain/errors/domain-error.js';
import { InfrastructureError } from '../../../../../services/create-content-service-content/src/domain/errors/infrastructure-error.js';

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : f.endsWith('.js') ? [join(dir, f)] : []));
const SRC = 'services/create-content-service-content/src';

// Yeni DomainError kodu UC YERE birlikte eklenir: firlatma noktasi, CODE_TO_FACTORY, web i18n apiErrors.
// Bu test ilk ikisini kilitler (kod haritada yoksa 400'e duser ve yanlis durum kodu dondurur).
describe('hata kodu haritası', () => {
  // `new DomainError('X'` ve use-case'lerdeki `need(kosul, 'X', mesaj)` yardimcisi
  const patterns = [/new (?:Domain|Infrastructure)Error\(\s*'([A-Z][A-Z0-9_]+)'/g, /\bneed\([^,]+,\s*'([A-Z][A-Z0-9_]+)'/g];
  const thrown = new Set(walk(SRC).flatMap((f) => patterns.flatMap((re) => [...readFileSync(f, 'utf8').matchAll(re)].map((m) => m[1]))));

  test('kodda fırlatılan her kod haritada VAR (LLM_* adaptör kodları hariç)', () => {
    const adapterOnly = new Set(['LLM_TRUNCATED', 'LLM_INVALID_JSON', 'LLM_EMPTY_RESPONSE']);
    const missing = [...thrown].filter((c) => !(c in CODE_TO_FACTORY) && !adapterOnly.has(c));
    expect(missing).toEqual([]);
  });

  test('haritada kullanılmayan (ölü) kod yok', () => {
    expect(Object.keys(CODE_TO_FACTORY).filter((c) => !thrown.has(c))).toEqual([]);
  });

  test('durum kodları', () => {
    expect(toHttpError(new DomainError('ARTICLE_NOT_FOUND')).statusCode).toBe(404);
    expect(toHttpError(new DomainError('TOPIC_QUEUE_FULL')).statusCode).toBe(409);
    expect(toHttpError(new DomainError('LLM_NOT_CONFIGURED')).statusCode).toBe(503);
    expect(toHttpError(new DomainError('UNKNOWN_CODE')).statusCode).toBe(400);
    expect(toHttpError(new InfrastructureError('PORT_NOT_CONFIGURED')).statusCode).toBe(503);
    expect(toHttpError(new InfrastructureError('LLM_TRUNCATED')).statusCode).toBe(500);
    expect(toHttpError({ code: '23505' }).statusCode).toBe(409);
  });
});
