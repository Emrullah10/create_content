// Arastirma toplayici: LLM'in onerdigi sorgu/URL'lerden aday kaynaklari (metinleriyle) toplar. Saglayicilar tek tek
// hata verebilir (ag, rate limit, 404): hata YUTULUR ve sonuca `failures` olarak yazilir; kalan kaynaklarla devam edilir.
export const makeResearchGatherer = ({ fetchPage, wikipedia, github, stackexchange, maxSources = 8, logger = console } = {}) => async ({ queries = [], docUrls = [], wikipediaTitles = [] }) => {
  const jobs = [
    ...docUrls.map((u) => ({ label: `doc:${u}`, run: async () => { const p = await fetchPage(u); return p ? [{ kind: 'web', ...p }] : []; } })),
    ...wikipediaTitles.map((t) => ({ label: `wikipedia:${t}`, run: () => wikipedia(t) })),
    ...queries.slice(0, 3).flatMap((q) => [
      { label: `github:${q}`, run: () => github(q) },
      { label: `stackexchange:${q}`, run: () => stackexchange(q) },
    ]),
  ];
  const settled = await Promise.allSettled(jobs.map((j) => j.run()));
  const seen = new Set();
  const sources = [];
  const failures = [];
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      failures.push({ source: jobs[i].label, error: r.reason?.message ?? String(r.reason) });
      logger.warn?.(`[research] ${jobs[i].label} failed: ${r.reason?.message}`);
      return;
    }
    for (const s of r.value) {
      if (!seen.has(s.url) && sources.length < maxSources) {
        seen.add(s.url);
        sources.push(s);
      }
    }
  });
  return { sources, failures };
};
