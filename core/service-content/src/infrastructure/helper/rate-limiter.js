// dev.to: ~10 istek / 30sn. Basit token-bucket tarzi bekleyen kuyruk.
export const makeRateLimiter = ({ maxRequests = 10, windowMs = 30_000 } = {}) => {
  const timestamps = [];

  const acquire = async () => {
    const now = Date.now();
    while (timestamps.length && now - timestamps[0] > windowMs) timestamps.shift();

    if (timestamps.length >= maxRequests) {
      const waitMs = windowMs - (now - timestamps[0]);
      await new Promise((r) => setTimeout(r, waitMs));
      return acquire();
    }

    timestamps.push(Date.now());
  };

  return { acquire };
};
