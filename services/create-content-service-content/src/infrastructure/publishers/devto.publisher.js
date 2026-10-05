import { makeRateLimiter } from '../helper/rate-limiter.js';
import { parseRetryAfter } from '../helper/retry-after-parser.js';

// dev.to (Forem API v1). `accept: application/vnd.forem.api-v1+json` ZORUNLU, kimlik `api-key` basligi (Bearer DEGIL).
// POST idempotent DEGILDIR: yalniz 429'da (istek islenmeden reddedilir) Retry-After'a uyarak tekrar denenir; 5xx/zaman asiminda
// tekrar POST ATILMAZ (cift yayin olmasin) — cagiran, bir sonraki denemeden once findByTitle ile var olani arar.
export class DevtoApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'DevtoApiError';
    this.status = status;
    this.body = body;
  }
}

export const makeDevtoPublisher = ({ apiKey, fetchImpl = fetch, rateLimiter = makeRateLimiter({ maxRequests: 10, windowMs: 30_000 }), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), baseUrl = 'https://dev.to/api' } = {}) => {
  if (!apiKey) throw new Error('dev.to publisher requires an apiKey');
  const headers = { 'api-key': apiKey, accept: 'application/vnd.forem.api-v1+json', 'content-type': 'application/json', 'user-agent': 'create-content' };

  const call = async (method, path, body) => {
    for (let attempt = 0; ; attempt += 1) {
      await rateLimiter.acquire();
      const res = await fetchImpl(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60_000) });
      if (res.status === 429 && attempt < 3) {
        await sleep(parseRetryAfter(res.headers.get('retry-after')) ?? 10_000 * 2 ** attempt);
        continue;
      }
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* govde JSON degil */
      }
      if (!res.ok) throw new DevtoApiError(res.status, `dev.to ${method} ${path} -> ${res.status}: ${(json?.error || text).toString().slice(0, 300)}`, json);
      return json;
    }
  };
  const shape = (a) => ({ id: String(a.id), url: a.url, published: Boolean(a.published ?? a.published_at) });

  return {
    create: async (payload) => shape(await call('POST', '/articles', { article: payload })),
    update: async (id, payload) => shape(await call('PUT', `/articles/${id}`, { article: payload })),
    // Kullanicinin tum makaleleri (yayinlanmis + taslak): dev.to'da elle yayina alinanlari yerel kayda yansitmak icin.
    listMine: async () => {
      const out = [];
      for (let page = 1; page <= 5; page += 1) {
        const list = await call('GET', `/articles/me/all?per_page=100&page=${page}`);
        out.push(...(list || []).map(shape));
        if (!list || list.length < 100) break;
      }
      return out;
    },
    // Kullanicinin kendi makaleleri (yayinlanmis + taslak) arasinda ayni baslik: yarim kalan bir POST'u tespit eder.
    findByTitle: async (title) => {
      for (let page = 1; page <= 3; page += 1) {
        const list = await call('GET', `/articles/me/all?per_page=100&page=${page}`);
        const hit = (list || []).find((a) => a.title === title);
        if (hit) return shape(hit);
        if (!list || list.length < 100) break;
      }
      return null;
    },
  };
};
