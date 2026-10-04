import { countCodeBlocks, countDiagramBlocks, extractPlaceholders, h2Headings, hasTable, proseOf, wordCount } from './markdown.js';

export const DEFAULT_THRESHOLDS = Object.freeze({
  minWords: 1400,
  maxWords: 2800,
  minSections: 5,
  minCodeBlocks: 3,
  minDiagrams: 2,
  requireTable: true,
});

// Yapay zeka klisesi / rubric sizintisi. Kucuk harfle eslesir.
export const BANNED_PHRASES = Object.freeze([
  "in today's fast-paced",
  'in the ever-evolving',
  'rapidly evolving landscape',
  'delve into',
  'unlock the power',
  'game-changer',
  'game changer',
  'dive deep into',
  'in this article, we will explore',
  'a testament to',
  'it is important to note that',
  'buckle up',
]);
const RUBRIC_LEAK = [/\ba (?:concrete|specific) (?:trade-?off|failure scenario) is\b/i, /\bcore thesis:/i, /\bcounterpoint:/i];

const NUMBER_CLAIM = /(?<![\w.])(\d[\d,]*(?:\.\d+)?)\s?(%|percent\b|x\b|×|times\b|ms\b|milliseconds?\b|seconds?\b|minutes?\b|hours?\b|[KMGT]B\b|requests?\b|users?\b|rows?\b|queries\b)/gi;

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim();
const digitsOf = (n) => n.replace(/,/g, '');

// Kaynaksiz sayi iddialari: metindeki "40%", "3x", "200 ms" gibi ifadeler arastirma olgulari ya da yazar notunda
// GECMIYORSA uydurma sayilir. Kod bloklari ve satir ici kod (`...`) disinda taranir.
export const findUnsupportedNumbers = (body, allowedText) => {
  const allowed = String(allowedText || '').replace(/,/g, '');
  const prose = proseOf(body).replace(/`[^`]*`/g, ' ').replace(/^#{1,6}\s.*$/gm, ' ');
  const found = [];
  for (const m of prose.matchAll(NUMBER_CLAIM)) {
    const value = digitsOf(m[1]);
    const unit = m[2].toLowerCase();
    if (new RegExp(`(?<![\\d.])${value.replace('.', '\\.')}(?![\\d])`).test(allowed)) continue;
    found.push({ text: m[0].trim(), strong: unit === '%' || unit === 'percent' || unit === 'x' || unit === '×' || unit === 'times' });
  }
  return found;
};

const tokens = (p) => new Set(norm(p).split(' ').filter((w) => w.length > 3));
export const findDuplicateParagraphs = (body) => {
  const paras = proseOf(body)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.split(/\s+/).length > 25 && !p.startsWith('|'));
  const sets = paras.map(tokens);
  const dups = [];
  for (let i = 0; i < paras.length; i += 1) {
    for (let j = i + 1; j < paras.length; j += 1) {
      const inter = [...sets[i]].filter((w) => sets[j].has(w)).length;
      const union = new Set([...sets[i], ...sets[j]]).size;
      if (union && inter / union >= 0.8) dups.push([paras[i].slice(0, 60), paras[j].slice(0, 60)]);
    }
  }
  return dups;
};

export const findBannedPhrases = (body) => {
  const text = proseOf(body).toLowerCase();
  const hits = BANNED_PHRASES.filter((p) => text.includes(p));
  for (const re of RUBRIC_LEAK) if (re.test(proseOf(body))) hits.push(String(re.source));
  return hits;
};

// -> { passed, errors, warnings, checks:[{ id, ok, severity, detail }], metrics }
export const runQualityChecks = ({ body, allowedText = '', thresholds = {} }) => {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const words = wordCount(body);
  const sections = h2Headings(body).length;
  const code = countCodeBlocks(body);
  const diagrams = countDiagramBlocks(body) + extractPlaceholders(body).length;
  const table = hasTable(body);
  const unsupported = findUnsupportedNumbers(body, allowedText);
  const strong = unsupported.filter((u) => u.strong);
  const dups = findDuplicateParagraphs(body);
  const banned = findBannedPhrases(body);
  const leftovers = [...body.matchAll(/\bTODO\b|\bFIXME\b|\[\.\.\.\]|lorem ipsum/gi)].map((m) => m[0]);
  const stray = [...body.matchAll(/\{\{(?!DIAGRAM_\d+\}\})[^}]*\}\}/g)].map((m) => m[0]);

  const checks = [
    { id: 'word-count', ok: words >= t.minWords && words <= t.maxWords, severity: 'error', detail: `${words} words (target ${t.minWords}-${t.maxWords})` },
    { id: 'sections', ok: sections >= t.minSections, severity: 'error', detail: `${sections} H2 sections (min ${t.minSections})` },
    { id: 'code-blocks', ok: code >= t.minCodeBlocks, severity: 'error', detail: `${code} code blocks (min ${t.minCodeBlocks})` },
    { id: 'diagrams', ok: diagrams >= t.minDiagrams, severity: 'error', detail: `${diagrams} diagrams (min ${t.minDiagrams})` },
    { id: 'table', ok: !t.requireTable || table, severity: 'warning', detail: table ? 'comparison table present' : 'no markdown table' },
    { id: 'unsupported-numbers', ok: strong.length === 0, severity: 'error', detail: strong.length ? `unsourced figures: ${strong.map((s) => s.text).join(', ')}` : 'no unsourced percentages/multipliers' },
    { id: 'minor-numbers', ok: unsupported.length === strong.length, severity: 'warning', detail: unsupported.length === strong.length ? 'ok' : `unsourced quantities: ${unsupported.filter((u) => !u.strong).map((s) => s.text).join(', ')}` },
    { id: 'duplicate-paragraphs', ok: dups.length === 0, severity: 'error', detail: dups.length ? `${dups.length} near-duplicate paragraph pair(s): "${dups[0][0]}…"` : 'none' },
    { id: 'banned-phrases', ok: banned.length === 0, severity: 'error', detail: banned.length ? `cliché/leak: ${banned.join(', ')}` : 'none' },
    { id: 'leftovers', ok: leftovers.length === 0 && stray.length === 0, severity: 'error', detail: leftovers.length || stray.length ? `leftover markers: ${[...leftovers, ...stray].join(', ')}` : 'none' },
  ];
  const errors = checks.filter((c) => !c.ok && c.severity === 'error');
  const warnings = checks.filter((c) => !c.ok && c.severity === 'warning');
  return { passed: errors.length === 0, errors, warnings, checks, metrics: { words, sections, code, diagrams, table } };
};
