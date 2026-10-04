import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { safeFetch } from './safe-fetch.js';

const MAX_TEXT = 8000;
const clean = (t) => t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

export const htmlToText = (html, url) => {
  const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() }); // betikler CALISTIRILMAZ (runScripts yok)
  const article = new Readability(dom.window.document).parse();
  return { title: article?.title || dom.window.document.title || url, text: clean(article?.textContent || dom.window.document.body?.textContent || '') };
};

// Sayfayi ceker ve okunabilir metne indirger. 200 olmayan / bos / HTML-olmayan-binary yanit null doner (kaynak atilir).
export const makeFetchPage = ({ fetchImpl, lookup } = {}) => async (url) => {
  const res = await safeFetch(url, { fetchImpl, lookup });
  if (res.status !== 200 || !res.text) return null;
  const type = res.contentType.toLowerCase();
  let title = url;
  let text;
  if (type.includes('html')) ({ title, text } = htmlToText(res.text, res.url));
  else if (type.includes('text/plain') || type.includes('markdown')) text = clean(res.text);
  else return null;
  return text.length >= 200 ? { url: res.url, title, text: text.slice(0, MAX_TEXT) } : null;
};
