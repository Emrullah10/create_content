import { countCodeBlocks, countDiagramBlocks, hasTable, stripCitationMarkers, wordCount } from './markdown.js';

// Model bazen bolum basligini tekrar yazar ya da "Here is the section:" gibi onsoz ekler; bunlar otomatik temizlenir.
export const cleanSectionBody = (body, heading) => {
  let lines = String(body).replace(/\r/g, '').trim().split('\n');
  const isHeadingLine = (l) => /^#{1,3}\s+/.test(l) && l.replace(/^#{1,3}\s+/, '').trim().toLowerCase() === String(heading).trim().toLowerCase();
  while (lines.length && (lines[0].trim() === '' || isHeadingLine(lines[0]) || /^(here is|here's|sure[,!]|below is)\b.*:\s*$/i.test(lines[0].trim()))) lines = lines.slice(1);
  return stripCitationMarkers(lines.join('\n')).trim();
};

const fenceLines = (body) => body.split('\n').filter((l) => /^```/.test(l.trim())).length;

// -> sorun listesi (bos = gecerli). `plan`: outline'daki bolum plani.
export const validateSection = (plan, body) => {
  const problems = [];
  if (fenceLines(body) % 2 !== 0) problems.push('a code fence is not closed (odd number of ``` lines)');
  const words = wordCount(body);
  if (words < Math.round(plan.targetWords * 0.5)) problems.push(`too short: ${words} words, target is about ${plan.targetWords}`);
  if (words > Math.round(plan.targetWords * 1.9)) problems.push(`too long: ${words} words, target is about ${plan.targetWords}`);
  if (plan.codePlan && countCodeBlocks(body) === 0) problems.push(`missing the required ${plan.codePlan.language} code block (${plan.codePlan.shows})`);
  if (plan.diagramPlan && countDiagramBlocks(body) === 0) problems.push(`missing the required mermaid ${plan.diagramPlan.type} diagram (${plan.diagramPlan.shows}) with a "*Figure: ...*" caption`);
  if (plan.tableHint && !hasTable(body)) problems.push(`missing the required markdown table (${plan.tableHint})`);
  return problems;
};

// Yazim sirasi: gövde + karsi-arguman bolumleri sirayla, SONRA sonuc, EN SON giris (ikisi de tum icerigi bilmeli).
export const writingOrder = (sections) => {
  const rank = (s) => (s.kind === 'intro' ? 2 : s.kind === 'conclusion' ? 1 : 0);
  return [...sections].sort((a, b) => rank(a) - rank(b) || a.position - b.position);
};

export const lastParagraph = (body) => body.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p && !p.startsWith('```') && !p.startsWith('|')).pop() ?? '';
