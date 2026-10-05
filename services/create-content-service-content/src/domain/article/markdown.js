// Saf markdown yardimcilari (I/O yok). Kod bloklari satir bazli taranir: regex ile ``` eslestirmek
// icerideki ````/``` kombinasyonlarinda sessizce yanlis sonuc verirdi.
const OPEN = /^```([\w+#.-]*)[^\n]*$/;
const CLOSE = /^```\s*$/;

// -> [{ lang, code, startLine, endLine }] (endLine dahil, 0 tabanli)
export const parseCodeBlocks = (markdown) => {
  const lines = markdown.split('\n');
  const blocks = [];
  let open = null;
  lines.forEach((line, i) => {
    if (!open) {
      const m = OPEN.exec(line);
      if (m && !CLOSE.test(line)) open = { lang: (m[1] || '').toLowerCase(), startLine: i, body: [] };
      return;
    }
    if (CLOSE.test(line)) {
      blocks.push({ lang: open.lang, code: open.body.join('\n'), startLine: open.startLine, endLine: i });
      open = null;
    } else open.body.push(line);
  });
  return blocks;
};

export const isDiagramBlock = (b) => b.lang === 'mermaid';

export const countCodeBlocks = (markdown) => parseCodeBlocks(markdown).filter((b) => !isDiagramBlock(b)).length;
export const countDiagramBlocks = (markdown) => parseCodeBlocks(markdown).filter(isDiagramBlock).length;

// Kod/diyagram bloklari disindaki duz metin (kelime sayimi, tekrar tespiti, sayi denetimi icin).
export const proseOf = (markdown) => {
  const lines = markdown.split('\n');
  const drop = new Set();
  for (const b of parseCodeBlocks(markdown)) for (let i = b.startLine; i <= b.endLine; i += 1) drop.add(i);
  return lines.filter((_, i) => !drop.has(i)).join('\n');
};

export const wordCount = (markdown) =>
  proseOf(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

export const hasTable = (markdown) => /^\s*\|.+\|\s*\n\s*\|[\s:|-]+\|\s*$/m.test(proseOf(markdown));

export const h2Headings = (markdown) => proseOf(markdown).split('\n').filter((l) => /^##\s+\S/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());

export const extractLinks = (markdown) => {
  const urls = new Set();
  const prose = proseOf(markdown);
  for (const m of prose.matchAll(/(?<!!)\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) urls.add(m[1]);
  for (const m of prose.matchAll(/(?<![(\]])\bhttps?:\/\/[^\s)<>"']+/g)) urls.add(m[0].replace(/[.,;:!?]+$/, ''));
  return [...urls];
};

// [text](url) -> text ; cıplak URL -> '' (kirik link metinden cikarilir)
export const removeLink = (markdown, url) => {
  const esc = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return markdown
    .replace(new RegExp(`(?<!!)\\[([^\\]]*)\\]\\(${esc}\\)`, 'g'), '$1')
    .replace(new RegExp(`(?<![(\\]])${esc}`, 'g'), '');
};

export const slugify = (title, maxLength = 80) =>
  String(title)
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '') || 'article';

// ---- Diyagramlar: ```mermaid bloklari {{DIAGRAM_N}} yer tutucusuna cevrilir ---------------------------
// Model diyagrami ait oldugu bolumde yazar; sistem bloklari DETERMINISTIK ayiklar (yer tutucu yanlis
// yere dusemez). Blogun hemen ardindan "*Figure: ...*" satiri varsa alt/caption olarak alinir.
export const placeholderToken = (key) => `{{${key}}}`;
export const PLACEHOLDER_RE = /\{\{(DIAGRAM_\d+)\}\}/g;

export const extractDiagrams = (markdown, { startIndex = 1 } = {}) => {
  const lines = markdown.split('\n');
  const blocks = parseCodeBlocks(markdown).filter(isDiagramBlock);
  const diagrams = [];
  const out = [];
  let cursor = 0;
  blocks.forEach((b, n) => {
    out.push(...lines.slice(cursor, b.startLine));
    const key = `DIAGRAM_${startIndex + n}`;
    let after = b.endLine + 1;
    while (after < lines.length && lines[after].trim() === '') after += 1;
    const cap = /^\*?\s*(?:Figure|Fig\.?|Diagram)\s*\d*\s*[:.-]\s*(.+?)\*?\s*$/i.exec(lines[after] || '');
    const caption = cap ? cap[1].trim() : null;
    cursor = cap ? after + 1 : b.endLine + 1;
    diagrams.push({ key, source: b.code.trim(), caption });
    out.push('', placeholderToken(key), '');
  });
  out.push(...lines.slice(cursor));
  return { markdown: out.join('\n').replace(/\n{3,}/g, '\n\n'), diagrams };
};

export const extractPlaceholders = (markdown) => [...markdown.matchAll(PLACEHOLDER_RE)].map((m) => m[1]);

// assets: [{ key, url, alt, caption }] ; url olmayan (basarisiz) diyagramin yer tutucusu govdeden temizlenir.
export const embedAssets = (markdown, assets) => {
  let md = markdown;
  for (const a of assets) {
    const token = placeholderToken(a.key);
    const block = a.url ? `![${a.alt || a.caption || 'diagram'}](${a.url})${a.caption ? `\n\n*${a.caption}*` : ''}` : '';
    md = md.split(token).join(block);
  }
  return md.replace(/\n{3,}/g, '\n\n');
};

// Model, prompt'taki olgu kimliklerini ([F12]) ya da dipnotlari ([^F12]: url) metne sizdirabiliyor. Dipnot tanimlari ve
// isaretleri ile kimlik etiketleri KODLA silinir (kaynaklar zaten sondaki "References" bolumunde listelenir). Kod bloklarina dokunmaz.
export const stripCitationMarkers = (markdown) => {
  const lines = markdown.split('\n');
  const inCode = new Set();
  for (const b of parseCodeBlocks(markdown)) for (let i = b.startLine; i <= b.endLine; i += 1) inCode.add(i);
  const out = [];
  lines.forEach((l, i) => {
    if (inCode.has(i)) return out.push(l);
    if (/^\s*\[\^[^\]]+\]:/.test(l)) return undefined; // dipnot tanimi
    return out.push(l.replace(/[ \t]*\[\^[^\]]+\]/g, '').replace(/[ \t]*\[F\d+\](?!\()/g, ''));
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
};
