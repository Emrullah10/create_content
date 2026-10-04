import { safeFetch } from '../research/safe-fetch.js';

// 401/403/429/999 "var ama botu reddediyor" demektir: link silinmez ama dogrulanmis da sayilmaz (unverified).
const UNVERIFIABLE = new Set([401, 403, 429, 999]);

export const makeLinkChecker = ({ fetchImpl, lookup, timeoutMs = 8000 } = {}) => {
  const check = async (url) => {
    try {
      let res = await safeFetch(url, { fetchImpl, lookup, timeoutMs, method: 'HEAD' });
      if ([400, 405, 501].includes(res.status)) res = await safeFetch(url, { fetchImpl, lookup, timeoutMs, maxBytes: 20_000 });
      if (res.status < 400) return { url, ok: true, status: res.status };
      if (UNVERIFIABLE.has(res.status)) return { url, ok: true, unverified: true, status: res.status };
      return { url, ok: false, status: res.status, reason: `HTTP ${res.status}` };
    } catch (e) {
      return { url, ok: false, reason: e.message };
    }
  };

  // En fazla `concurrency` istek ayni anda.
  const checkAll = async (urls, { concurrency = 5 } = {}) => {
    const queue = [...urls];
    const results = [];
    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length) results.push(await check(queue.shift()));
      }),
    );
    return results;
  };
  return { check, checkAll };
};
