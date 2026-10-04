import { describe, test, expect, jest } from '@jest/globals';
import { makeDevtoPublisher } from '../../../../../services/create-content-service-content/src/infrastructure/publishers/devto.publisher.js';
import { buildDevtoPayload, isMediumUrl, mediumImportUrl } from '../../../../../services/create-content-service-content/src/domain/publication/devto-payload.js';
import { appendReferences, referencedSources } from '../../../../../services/create-content-service-content/src/domain/article/references.js';

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const noLimit = { acquire: async () => {} };
const make = (fetchImpl, extra = {}) => makeDevtoPublisher({ apiKey: 'KEY', fetchImpl, rateLimiter: noLimit, sleep: async () => {}, ...extra });

describe('dev.to adaptörü', () => {
  test('doğru başlıklar: api-key (Bearer değil) ve Forem v1 accept', async () => {
    const fetchImpl = jest.fn(async () => json(201, { id: 1, url: 'https://dev.to/x', published: false }));
    await make(fetchImpl).create({ title: 't' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://dev.to/api/articles');
    expect(init.headers['api-key']).toBe('KEY');
    expect(init.headers.accept).toBe('application/vnd.forem.api-v1+json');
    expect(init.headers.authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ article: { title: 't' } });
  });

  test('429: Retry-After (saniye ve HTTP-date) ile tekrar denenir', async () => {
    const sleeps = [];
    const fetchImpl = jest.fn().mockResolvedValueOnce(json(429, { error: 'rate' }, { 'retry-after': '2' })).mockResolvedValueOnce(json(429, { error: 'rate' }, { 'retry-after': new Date(Date.now() + 5000).toUTCString() })).mockResolvedValueOnce(json(201, { id: 9, url: 'u', published: true }));
    const out = await make(fetchImpl, { sleep: async (ms) => sleeps.push(ms) }).create({ title: 't' });
    expect(out).toEqual({ id: '9', url: 'u', published: true });
    expect(sleeps[0]).toBe(2000);
    expect(sleeps[1]).toBeGreaterThan(0);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  test('429 dört kez sürerse hata; 5xx\'te POST TEKRAR ATILMAZ', async () => {
    const always429 = jest.fn(async () => json(429, { error: 'rate' }, { 'retry-after': '1' }));
    await expect(make(always429).create({ title: 't' })).rejects.toMatchObject({ status: 429 });
    expect(always429).toHaveBeenCalledTimes(4);
    const fiveHundred = jest.fn(async () => json(500, { error: 'boom' }));
    await expect(make(fiveHundred).create({ title: 't' })).rejects.toMatchObject({ status: 500, message: expect.stringContaining('boom') });
    expect(fiveHundred).toHaveBeenCalledTimes(1);
  });

  test('422 gövdedeki hata mesajını taşır', async () => {
    await expect(make(async () => json(422, { error: 'Title is too long' })).create({ title: 't' })).rejects.toMatchObject({ status: 422, message: expect.stringContaining('Title is too long') });
  });

  test('findByTitle sayfalar ve bulamazsa null', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, title: `a${i}`, url: 'u' }));
    const fetchImpl = jest.fn().mockResolvedValueOnce(json(200, page1)).mockResolvedValueOnce(json(200, [{ id: 500, title: 'target', url: 'https://dev.to/target', published: false }]));
    expect(await make(fetchImpl).findByTitle('target')).toEqual({ id: '500', url: 'https://dev.to/target', published: false });
    expect(fetchImpl.mock.calls[1][0]).toContain('page=2');
    expect(await make(async () => json(200, [])).findByTitle('nope')).toBeNull();
  });

  test('apiKey zorunlu', () => expect(() => makeDevtoPublisher({})).toThrow(/apiKey/));
});

describe('dev.to yükü', () => {
  const article = { articleTitle: 'T'.repeat(200), articleBodyMarkdown: 'body', articleTags: ['Node JS', 'react-native', 'a', 'b', 'c'], articleSummary: 'S '.repeat(200) };
  test('etiketler sanitize ve en fazla 4; başlık ve açıklama kısalır; kapak main_image', () => {
    const p = buildDevtoPayload({ article, coverUrl: 'https://cdn/c.png', published: true });
    expect(p.tags).toEqual(['nodejs', 'reactnative', 'a', 'b']);
    expect(p.title.length).toBeLessThanOrEqual(128);
    expect(p.description.length).toBeLessThanOrEqual(170);
    expect(p).toMatchObject({ published: true, main_image: 'https://cdn/c.png', body_markdown: 'body' });
  });
  test('kapak/özet yoksa alanlar eklenmez', () => {
    const p = buildDevtoPayload({ article: { articleTitle: 'x', articleBodyMarkdown: 'b', articleTags: [] }, published: false });
    expect(p).toEqual({ title: 'x', body_markdown: 'b', published: false, tags: [] });
  });
  test('Medium URL doğrulaması ve import bağlantısı', () => {
    expect(isMediumUrl('https://medium.com/@a/b')).toBe(true);
    expect(isMediumUrl('https://x.medium.com/b')).toBe(true);
    expect(isMediumUrl('https://notmedium.com/b')).toBe(false);
    expect(isMediumUrl('https://medium.com.evil.io/b')).toBe(false);
    expect(mediumImportUrl('https://dev.to/a b')).toBe('https://medium.com/p/import?url=https%3A%2F%2Fdev.to%2Fa%20b');
  });
});

describe('referanslar', () => {
  const brief = { facts: [{ id: 'F1', sourceUrl: 'https://a.example/' }, { id: 'F2', sourceUrl: 'https://b.example/' }, { id: 'F3', sourceUrl: 'https://a.example/' }], sources: [{ url: 'https://a.example/', title: 'A [docs]' }, { url: 'https://b.example/', title: 'B' }] };
  const outline = { sections: [{ factIds: ['F1', 'F3'] }, { factIds: [] }] };
  test('yalnız kullanılan olguların kaynakları, tekilleşmiş', () => expect(referencedSources(brief, outline)).toEqual([{ url: 'https://a.example/', title: 'A [docs]' }]));
  test('eklenir, idempotent, kaynak yoksa dokunmaz', () => {
    const once = appendReferences('body', brief, outline);
    expect(once).toContain('## References\n\n- [A docs](https://a.example/)');
    expect(appendReferences(once, brief, outline)).toBe(once);
    expect(appendReferences('body', { facts: [], sources: [] }, outline)).toBe('body');
  });
});
