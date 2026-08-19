import { parseRetryAfter } from '../../../../core/service-content/src/infrastructure/helper/retry-after-parser.js';

describe('retry-after-parser: parseRetryAfter', () => {
  test('parses integer-seconds format', () => {
    expect(parseRetryAfter('30')).toBe(30_000);
  });

  test('parses RFC 7231 HTTP-date format without NaN', () => {
    const future = new Date(Date.now() + 60_000).toUTCString();
    const result = parseRetryAfter(future);
    expect(result).toBeGreaterThan(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  test('returns null for missing header', () => {
    expect(parseRetryAfter(undefined)).toBeNull();
  });
});
