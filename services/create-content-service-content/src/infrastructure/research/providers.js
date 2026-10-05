import { htmlToText } from './fetch-page.js';
import { safeFetch } from './safe-fetch.js';

const MAX_TEXT = 8000;
const json = async (url, opts) => {
  const res = await safeFetch(url, opts);
  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${url}`);
  return JSON.parse(res.text);
};
const stripHtml = (html) => htmlToText(`<html><body>${html}</body></html>`, 'https://stackoverflow.com/').text;

// Her saglayici { kind, url, title, text }[] doner. Hatalar cagirana ATILIR; toplayici (gatherer) tek tek yutar.
export const makeWikipedia = ({ fetchImpl, lookup } = {}) => async (title) => {
  const api = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
  const data = await json(api, { fetchImpl, lookup });
  const page = Object.values(data?.query?.pages || {})[0];
  if (!page?.extract || page.missing !== undefined) return [];
  return [{ kind: 'wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`, title: page.title, text: page.extract.slice(0, MAX_TEXT) }];
};

export const makeGithub = ({ token, fetchImpl, lookup } = {}) => async (query) => {
  const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const found = await json(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=2`, { fetchImpl, lookup, headers });
  const out = [];
  for (const repo of found.items || []) {
    const res = await safeFetch(`https://api.github.com/repos/${repo.full_name}/readme`, { fetchImpl, lookup, headers: { ...headers, accept: 'application/vnd.github.raw+json' } });
    if (res.status === 200 && res.text.length > 200) out.push({ kind: 'github', url: repo.html_url, title: `${repo.full_name}: README`, text: res.text.slice(0, MAX_TEXT) });
  }
  return out;
};

export const makeStackExchange = ({ fetchImpl, lookup } = {}) => async (query) => {
  const base = 'https://api.stackexchange.com/2.3';
  const found = await json(`${base}/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=2&filter=withbody`, { fetchImpl, lookup });
  const out = [];
  for (const q of found.items || []) {
    const answers = await json(`${base}/questions/${q.question_id}/answers?order=desc&sort=votes&site=stackoverflow&pagesize=1&filter=withbody`, { fetchImpl, lookup });
    const best = answers.items?.[0];
    const text = [`Question: ${q.title}`, stripHtml(q.body || ''), best ? `Top answer (score ${best.score}):\n${stripHtml(best.body || '')}` : ''].join('\n\n');
    if (best && text.length > 300) out.push({ kind: 'stackexchange', url: q.link, title: q.title, text: text.slice(0, MAX_TEXT) });
  }
  return out;
};
