// Kayan pencere: windowMs icinde en fazla maxRequests istek; fazlasi pencere acilana kadar bekler.
export const makeRateLimiter = ({ maxRequests = 10, windowMs = 30_000, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) => {
  const stamps = [];
  const acquire = async () => {
    for (;;) {
      const t = now();
      while (stamps.length && t - stamps[0] >= windowMs) stamps.shift();
      if (stamps.length < maxRequests) {
        stamps.push(now());
        return;
      }
      await sleep(windowMs - (t - stamps[0]));
    }
  };
  return { acquire };
};
