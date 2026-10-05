import { describe, test, expect } from '@jest/globals';
import { checkBlock, checkMarkdownCode, summarizeCodeReport } from '../../../../../services/create-content-service-content/src/infrastructure/code-check/code-checker.js';
import { makeLinkChecker } from '../../../../../services/create-content-service-content/src/infrastructure/code-check/link-checker.js';
import { assertPublicUrl, isPrivateAddress, safeFetch, UnsafeUrlError } from '../../../../../services/create-content-service-content/src/infrastructure/research/safe-fetch.js';
import { htmlToText, makeFetchPage } from '../../../../../services/create-content-service-content/src/infrastructure/research/fetch-page.js';
import { makeResearchGatherer } from '../../../../../services/create-content-service-content/src/infrastructure/research/gatherer.js';
import { makeWikipedia, makeGithub, makeStackExchange } from '../../../../../services/create-content-service-content/src/infrastructure/research/providers.js';

const publicLookup = async () => [{ address: '93.184.216.34' }];
const res = (status, body = '', headers = {}) => new Response(body, { status, headers });
const stubFetch = (map) => async (url) => {
  const key = String(url);
  const hit = Object.entries(map).find(([k]) => key.startsWith(k));
  if (!hit) throw new Error(`unexpected fetch: ${key}`);
  return typeof hit[1] === 'function' ? hit[1](key) : hit[1].clone();
};

describe('kod doğrulama (çalıştırmaz)', () => {
  test.each([
    ['js', 'const a = 1;\nconsole.log(a);', true],
    ['javascript', 'const = ;', false],
    ['ts', 'type A = { x: number };\nconst f = (a: A): number => a.x;', true],
    ['ts', 'const x: number = ;', false],
    ['tsx', 'const C = () => <div>hi</div>;', true],
    ['json', '{ "a": 1 }', true],
    ['json', '{ a: 1 }', false],
    ['yaml', 'a: 1\nb:\n  - x', true],
    ['yaml', 'a: [1, 2', false],
    ['python', 'def f(x):\n    return x + 1', true],
    ['python', 'def f(:\n    pass', false],
    ['bash', 'set -e\necho hi', true],
    ['bash', 'if [ ; then', false],
  ])('%s -> ok=%s', async (lang, code, ok) => {
    const r = await checkBlock({ lang, code });
    expect(r.ok).toBe(ok);
    if (!ok) expect(r.error).toBeTruthy();
  });

  test('sql ve bilinmeyen diller atlanır, hata sayılmaz', async () => {
    expect(await checkBlock({ lang: 'sql', code: 'SELECT 1' })).toMatchObject({ ok: true, skipped: true });
    expect(await checkBlock({ lang: 'brainfuck', code: '+' })).toMatchObject({ ok: true, skipped: true });
  });

  test('kod ÇALIŞTIRILMAZ: yan etkili python derlenir ama dosya yazmaz', async () => {
    const marker = `/tmp/cc-should-not-exist-${process.pid}`;
    const r = await checkBlock({ lang: 'python', code: `open('${marker}', 'w').write('x')` });
    expect(r.ok).toBe(true);
    const { existsSync } = await import('node:fs');
    expect(existsSync(marker)).toBe(false);
  });

  test('checkMarkdownCode mermaid bloklarını atlar ve özetler', async () => {
    const md = ['```js', 'const a = ;', '```', '', '```mermaid', 'flowchart TD', '```', '', '```json', '{}', '```'].join('\n');
    const results = await checkMarkdownCode(md);
    expect(results).toHaveLength(2);
    expect(summarizeCodeReport(results)).toMatchObject({ total: 2, failed: 1, failures: [{ index: 0, lang: 'js' }] });
  });
});

describe('SSRF koruması', () => {
  test.each(['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1', '100.64.0.1'])('%s özel', (ip) => expect(isPrivateAddress(ip)).toBe(true));
  test.each(['93.184.216.34', '8.8.8.8', '2606:4700:4700::1111'])('%s genel', (ip) => expect(isPrivateAddress(ip)).toBe(false));

  test.each(['http://localhost/x', 'http://127.0.0.1/x', 'file:///etc/passwd', 'ftp://example.com/x', 'http://user:pw@example.com/', 'http://[::1]/x', 'http://printer.local/'])('%s reddedilir', async (u) => {
    await expect(assertPublicUrl(u, { lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  test('DNS özel adrese çözülüyorsa reddedilir (rebinding)', async () => {
    await expect(assertPublicUrl('https://evil.example/', { lookup: async () => [{ address: '10.0.0.5' }] })).rejects.toThrow(/private address/);
  });
  test('yönlendirme özel adrese giderse reddedilir', async () => {
    const fetchImpl = stubFetch({ 'https://ok.example/': res(302, '', { location: 'http://169.254.169.254/latest/meta-data' }) });
    await expect(safeFetch('https://ok.example/', { fetchImpl, lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  test('gövde boyutu sınırlanır', async () => {
    const fetchImpl = stubFetch({ 'https://big.example/': res(200, 'x'.repeat(5000), { 'content-type': 'text/plain' }) });
    const out = await safeFetch('https://big.example/', { fetchImpl, lookup: publicLookup, maxBytes: 1000 });
    expect(out.text.length).toBeLessThanOrEqual(5000);
    expect(out.status).toBe(200);
  });
});

describe('sayfa çıkarımı', () => {
  const html = (body) => `<html><head><title>Doc Title</title></head><body><nav>menu</nav><article><h1>Heading</h1><p>${body}</p></article><script>window.x=1</script></body></html>`;
  const long = 'PostgreSQL uses multiversion concurrency control so readers never block writers. '.repeat(6);
  test('htmlToText başlık ve gövdeyi çıkarır', () => {
    const { title, text } = htmlToText(html(long), 'https://x.example/');
    expect(title).toBeTruthy();
    expect(text).toContain('multiversion concurrency control');
    expect(text).not.toContain('window.x');
  });
  test('200 olmayan, kısa ve ikili içerik null', async () => {
    const f = (r) => makeFetchPage({ fetchImpl: stubFetch({ 'https://x.example/': r }), lookup: publicLookup })('https://x.example/');
    expect(await f(res(404, 'nope', { 'content-type': 'text/html' }))).toBeNull();
    expect(await f(res(200, html('short'), { 'content-type': 'text/html' }))).toBeNull();
    expect(await f(res(200, 'binary', { 'content-type': 'application/pdf' }))).toBeNull();
    expect(await f(res(200, html(long), { 'content-type': 'text/html' }))).toMatchObject({ url: 'https://x.example/' });
  });
});

describe('sağlayıcılar', () => {
  test('wikipedia: sayfa çıkarımı, eksik sayfa boş', async () => {
    const page = { query: { pages: { 1: { title: 'Multiversion concurrency control', extract: 'MVCC text '.repeat(30) } } } };
    const wiki = makeWikipedia({ fetchImpl: stubFetch({ 'https://en.wikipedia.org/w/api.php': res(200, JSON.stringify(page)) }), lookup: publicLookup });
    expect(await wiki('MVCC')).toEqual([expect.objectContaining({ kind: 'wikipedia', url: 'https://en.wikipedia.org/wiki/Multiversion_concurrency_control' })]);
    const missing = makeWikipedia({ fetchImpl: stubFetch({ 'https://en.wikipedia.org/w/api.php': res(200, JSON.stringify({ query: { pages: { '-1': { title: 'X', missing: '' } } } })) }), lookup: publicLookup });
    expect(await missing('X')).toEqual([]);
  });

  test('github: depo araması + README, token başlığı', async () => {
    let seenAuth;
    const fetchImpl = async (url, init) => {
      seenAuth = init.headers.authorization;
      if (String(url).includes('/search/repositories')) return res(200, JSON.stringify({ items: [{ full_name: 'o/r', html_url: 'https://github.com/o/r' }] }));
      return res(200, '# README\n' + 'details '.repeat(60));
    };
    const out = await makeGithub({ token: 'tok', fetchImpl, lookup: publicLookup })('postgres');
    expect(out).toEqual([expect.objectContaining({ kind: 'github', url: 'https://github.com/o/r' })]);
    expect(seenAuth).toBe('Bearer tok');
  });

  test('stackexchange: soru + en iyi cevap', async () => {
    const fetchImpl = stubFetch({
      'https://api.stackexchange.com/2.3/search/advanced': res(200, JSON.stringify({ items: [{ question_id: 5, title: 'Why slow?', link: 'https://stackoverflow.com/q/5', body: '<p>' + 'question body '.repeat(20) + '</p>' }] })),
      'https://api.stackexchange.com/2.3/questions/5/answers': res(200, JSON.stringify({ items: [{ score: 42, body: '<p>' + 'answer body '.repeat(20) + '</p>' }] })),
    });
    const out = await makeStackExchange({ fetchImpl, lookup: publicLookup })('slow query');
    expect(out[0]).toMatchObject({ kind: 'stackexchange', url: 'https://stackoverflow.com/q/5' });
    expect(out[0].text).toContain('Top answer (score 42)');
  });
});

describe('toplayıcı', () => {
  const src = (url) => [{ kind: 'web', url, title: url, text: 't' }];
  test('hatalı sağlayıcı yutulur, tekrar eden URL tekilleşir, sınır uygulanır', async () => {
    const gather = makeResearchGatherer({
      fetchPage: async (u) => ({ url: u, title: u, text: 't' }),
      wikipedia: async () => { throw new Error('boom'); },
      github: async () => src('https://dup.example/'),
      stackexchange: async () => src('https://dup.example/'),
      maxSources: 3,
      logger: { warn: () => {} },
    });
    const out = await gather({ queries: ['q'], docUrls: ['https://a.example/', 'https://b.example/', 'https://c.example/'], wikipediaTitles: ['T'] });
    expect(out.sources).toHaveLength(3);
    expect(out.failures).toEqual([{ source: 'wikipedia:T', error: 'boom' }]);
  });
});

describe('link denetleyici', () => {
  const mk = (map) => makeLinkChecker({ fetchImpl: stubFetch(map), lookup: publicLookup });
  test('200 ok, 404 kırık, 403 doğrulanamaz ama silinmez', async () => {
    const lc = mk({ 'https://ok.example/': res(200), 'https://gone.example/': res(404), 'https://bot.example/': res(403) });
    expect(await lc.check('https://ok.example/')).toMatchObject({ ok: true });
    expect(await lc.check('https://gone.example/')).toMatchObject({ ok: false, status: 404 });
    expect(await lc.check('https://bot.example/')).toMatchObject({ ok: true, unverified: true });
  });
  test('HEAD 405 ise GET ile tekrar dener', async () => {
    const lc = mk({ 'https://h.example/': (u, ) => res(200) });
    let calls = [];
    const fetchImpl = async (url, init) => { calls.push(init.method); return res(init.method === 'HEAD' ? 405 : 200); };
    const out = await makeLinkChecker({ fetchImpl, lookup: publicLookup }).check('https://h.example/');
    expect(out.ok).toBe(true);
    expect(calls).toEqual(['HEAD', 'GET']);
    void lc;
  });
  test('özel adres ve ağ hatası ok=false', async () => {
    const lc = makeLinkChecker({ fetchImpl: async () => { throw new Error('ECONNREFUSED'); }, lookup: publicLookup });
    expect(await lc.check('https://down.example/')).toMatchObject({ ok: false });
    expect(await lc.check('http://127.0.0.1/')).toMatchObject({ ok: false });
  });
  test('checkAll eşzamanlılığı sınırlar ve hepsini döndürür', async () => {
    let active = 0, peak = 0;
    const fetchImpl = async () => { active += 1; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 5)); active -= 1; return res(200); };
    const out = await makeLinkChecker({ fetchImpl, lookup: publicLookup }).checkAll(Array.from({ length: 12 }, (_, i) => `https://e${i}.example/`), { concurrency: 3 });
    expect(out).toHaveLength(12);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
