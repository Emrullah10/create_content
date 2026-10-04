const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// shouldRetry(err) false ise HEMEN firlatir. delayMs(err, attempt) verilirse (Retry-After gibi) ustel bekleyisin yerine gecer.
export const withRetry = async (fn, { attempts = 3, baseDelayMs = 500, shouldRetry = () => true, delayMs, sleep = defaultSleep } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(err)) throw err;
      if (i < attempts - 1) await sleep(delayMs?.(err, i) ?? baseDelayMs * 2 ** i);
    }
  }
  throw lastErr;
};
