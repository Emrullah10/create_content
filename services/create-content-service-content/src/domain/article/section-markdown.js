import { wordCount } from './markdown.js';

// Bolumleri tek govdeye birlestirir. Giris bolumunun basligi yoktur; digerleri "## Baslik".
export const assembleBody = (sections) =>
  sections
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => (s.kind === 'intro' ? s.body.trim() : `## ${s.heading}\n\n${s.body.trim()}`))
    .join('\n\n')
    .trim();

export const sectionWordCounts = (sections) => sections.map((s) => ({ position: s.position, heading: s.heading, words: wordCount(s.body) }));
