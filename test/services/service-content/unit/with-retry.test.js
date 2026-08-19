import { withRetry } from '../../../../core/service-content/src/infrastructure/helper/retry.js';

describe('withRetry', () => {
  test('retries retryable errors up to attempts limit then throws', async () => {
    let calls = 0;
    const fn = async () => { calls++; throw new Error('fail'); };
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow('fail');
    expect(calls).toBe(3);
  });

  test('succeeds after transient failures', async () => {
    let calls = 0;
    const fn = async () => { calls++; if (calls < 2) throw new Error('transient'); return 'ok'; };
    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  test('does not retry when shouldRetry returns false', async () => {
    let calls = 0;
    const fn = async () => { calls++; throw new Error('permanent'); };
    await expect(withRetry(fn, { attempts: 5, baseDelayMs: 1, shouldRetry: () => false })).rejects.toThrow('permanent');
    expect(calls).toBe(1);
  });
});
