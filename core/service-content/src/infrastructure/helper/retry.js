export const withRetry = async (fn, { attempts = 3, baseDelayMs = 500, shouldRetry = () => true } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1 && shouldRetry(err)) await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
      else if (!shouldRetry(err)) throw err;
    }
  }
  throw lastErr;
};
