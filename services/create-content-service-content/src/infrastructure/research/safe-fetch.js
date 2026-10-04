import dns from 'node:dns/promises';
import net from 'node:net';

// URL'ler LLM'den ve disaridan geliyor: yerel/ozel aglara (SSRF) istek ATILMAZ. Her yonlendirme adiminda yeniden denetlenir.
export class UnsafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

export const isPrivateAddress = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::' || v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  return true;
};

export const assertPublicUrl = async (rawUrl, { lookup = (host) => dns.lookup(host, { all: true }) } = {}) => {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`invalid URL: ${rawUrl}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new UnsafeUrlError(`unsupported protocol: ${url.protocol}`);
  if (url.username || url.password) throw new UnsafeUrlError('credentials in URL are not allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new UnsafeUrlError(`private host: ${host}`);
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host);
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) throw new UnsafeUrlError(`host resolves to a private address: ${host}`);
  return url;
};

const readCapped = async (res, maxBytes) => {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      reader.cancel().catch(() => {}); // beklenmez: tee edilmis/yavas akista iptal sonsuza kadar asili kalabilir
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
};

// -> { status, url, contentType, text }. Yonlendirmeler elle (en fazla 4) izlenir.
export const safeFetch = async (rawUrl, { fetchImpl = fetch, lookup, timeoutMs = 10_000, maxBytes = 1_500_000, headers = {}, method = 'GET', maxRedirects = 4 } = {}) => {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const url = await assertPublicUrl(current, { lookup });
    const res = await fetchImpl(url, {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'create-content-research/1.0 (+personal tool)', accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.5', ...headers },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), url).toString();
      continue;
    }
    const text = method === 'HEAD' ? '' : await readCapped(res, maxBytes);
    return { status: res.status, url: url.toString(), contentType: res.headers.get('content-type') || '', text };
  }
  throw new UnsafeUrlError(`too many redirects: ${rawUrl}`);
};
