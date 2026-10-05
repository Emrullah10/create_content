// Olgu dogrulama: LLM'in cikardigi {claim, quote} ciftinde `quote`, kaynak metinde BIREBIR (bosluk/yazim
// normalize edilerek) gecmiyorsa olgu atilir. Uydurma alintilari kodla eler; modele guvenilmez.
const squash = (s) => String(s).toLowerCase().replace(/[\s\u00a0]+/g, ' ').replace(/[\u201c\u201d"']/g, '"').trim();

export const quoteInSource = (quote, sourceText) => {
  const q = squash(quote);
  return q.length >= 20 && squash(sourceText).includes(q);
};

export const verifyFacts = (facts, sourceText) =>
  (Array.isArray(facts) ? facts : []).filter((f) => f?.claim && f?.quote && quoteInSource(f.quote, sourceText));

// Arastirma ozeti: kaynaklar arasi sirali, global id (F1..Fn) atanmis olgular.
export const buildBrief = (sources, { maxFacts = 25 } = {}) => {
  const facts = [];
  for (const s of sources) {
    for (const f of s.facts) {
      if (facts.length >= maxFacts) break;
      facts.push({ id: `F${facts.length + 1}`, claim: f.claim, quote: f.quote, sourceUrl: s.url, sourceTitle: s.title });
    }
  }
  return { facts, sources: sources.map((s) => ({ url: s.url, title: s.title, kind: s.kind })) };
};

// Kalite kontrolunde "izinli sayi" havuzu: olgu metinleri + yazar notlari.
export const allowedTextOf = (brief, ...extra) => [...(brief?.facts || []).flatMap((f) => [f.claim, f.quote]), ...extra].join('\n');
