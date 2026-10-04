export const REQUIRED_MIN_DIAGRAMS = 2;
export const REQUIRED_MIN_CODE_BLOCKS = 3;

export const makeArticle = ({ id, topicId, title, subtitle = null, slug, bodyMarkdown = '', summary = null, tags = [], status = 'drafting' }) => {
  if (!topicId) throw new Error('Article requires topicId');
  if (!title || !title.trim()) throw new Error('Article requires a non-empty title');
  if (!slug) throw new Error('Article requires a slug');

  return { id, topicId, title: title.trim(), subtitle, slug, bodyMarkdown, summary, tags, status };
};

export const countCodeBlocks = (markdown) => (markdown.match(/```/g) || []).length / 2;

export const wordCount = (markdown) => markdown.trim().split(/\s+/).filter(Boolean).length;

export const extractPlaceholders = (markdown) => [...markdown.matchAll(/\{\{DIAGRAM_\d+\}\}/g)].map((m) => m[0]);

// AI'in draft.md talimatina ragmen diyagram placeholder'larini "When this doesn't apply" /
// counterpoint basligina veya Conclusion'a koyma egilimi tekrarlanan bir davranis (2026-08-20'de
// 3 ayri prompt guclendirmesiyle bile duzelmedi) — bu yuzden govde ureti(l)dikten SONRA
// deterministik olarak duzeltiliyor: yasakli basliklarin altina dusen placeholder'lar, kendinden
// once gelen son teknik bolumun sonuna tasinir.
const BANNED_HEADING_PATTERN = /^#{1,3}\s*(when this doesn'?t apply|the other side|counterpoint|edge cases?|trade-?offs?|conclusion)/i;

export const relocatePlaceholdersOutOfBannedSections = (markdown) => {
  const lines = markdown.split('\n');
  const isHeading = (line) => /^#{1,3}\s/.test(line);

  const headingIndexesOf = (arr) => arr.reduce((acc, line, i) => {
    if (isHeading(line)) acc.push(i);
    return acc;
  }, []);

  const headingIndexes = headingIndexesOf(lines);
  const isBanned = (lineIndex) => {
    const headingBefore = [...headingIndexes].reverse().find((h) => h <= lineIndex);
    return headingBefore !== undefined && BANNED_HEADING_PATTERN.test(lines[headingBefore]);
  };

  const placeholderLineIndexes = lines.reduce((acc, line, i) => {
    if (extractPlaceholders(line).length > 0) acc.push(i);
    return acc;
  }, []);

  const toRelocate = new Set(placeholderLineIndexes.filter((i) => isBanned(i)));
  if (toRelocate.size === 0) return markdown;

  // Once tasinacak placeholder satirlarini govdeden cikar (orijinal sirayla), sonra kalan
  // metinde kendinden once gelen ilk yasakli-olmayan basligin hemen ardina tek tek ekle —
  // cikarma ve ekleme ayni gecise karismadigi icin index kaymasi olmuyor.
  const relocatedLines = [...toRelocate].sort((a, b) => a - b).map((i) => lines[i].trim());
  const remaining = lines.filter((_, i) => !toRelocate.has(i));

  let result = remaining;
  for (const placeholderLine of relocatedLines) {
    const headingsNow = headingIndexesOf(result);
    const targetHeading = [...headingsNow].reverse().find((h) => !BANNED_HEADING_PATTERN.test(result[h]));
    const insertAt = targetHeading !== undefined ? targetHeading + 2 : 1;
    result = [...result.slice(0, insertAt), '', placeholderLine, ...result.slice(insertAt)];
  }
  return result.join('\n');
};

// AI "inline inside the section" talimatini bazen bir cumlenin ortasina/sonuna placeholder'i
// yapistirarak yorumluyor (ornek: "...as needed. {{DIAGRAM_1}}"), kendi paragrafi olmadan.
// embed-assets asamasinda placeholder cok-satirli ![...](...)\n\n*caption* bloguyla degistirilince
// bu blok cumlenin ortasina gomulmus oluyor. Govde uretildikten SONRA, her placeholder'in
// bulundugu satiri kendi bos-satirla-ayrilmis paragrafina cikaran deterministik bir gecis eklendi —
// placeholder'dan once/sonra gelen metin parcalari (varsa) kendi satirlarina tasinir.
export const isolatePlaceholdersOnOwnLine = (markdown) => {
  const lines = markdown.split('\n');
  const result = [];

  for (const line of lines) {
    const placeholders = extractPlaceholders(line);
    if (placeholders.length === 0) {
      result.push(line);
      continue;
    }

    let rest = line;
    for (const token of placeholders) {
      const idx = rest.indexOf(token);
      const before = rest.slice(0, idx).trim();
      const after = rest.slice(idx + token.length).trim();
      if (before) result.push(before, '');
      result.push(token, '');
      rest = after;
    }
    if (rest) result.push(rest);
  }

  // Uc uc ekleme, art arda gelen bos satirlari (orijinal + eklenen ayirici) tekille indirilir.
  return result.join('\n').replace(/\n{3,}/g, '\n\n');
};
