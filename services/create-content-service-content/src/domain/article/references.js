// Referanslar: yalniz outline'daki bolumlerin KULLANDIGI olgularin dogrulanmis kaynaklari listelenir.
export const referencedSources = (brief, outline) => {
  const used = new Set((outline?.sections || []).flatMap((s) => s.factIds || []));
  const urls = [...new Set((brief?.facts || []).filter((f) => used.has(f.id)).map((f) => f.sourceUrl))];
  return urls.map((url) => ({ url, title: (brief.sources || []).find((s) => s.url === url)?.title || url }));
};

export const appendReferences = (markdown, brief, outline) => {
  if (/^##\s+References\s*$/im.test(markdown)) return markdown; // idempotent
  const refs = referencedSources(brief, outline);
  if (!refs.length) return markdown;
  return `${markdown.trimEnd()}\n\n## References\n\n${refs.map((r) => `- [${r.title.replace(/[[\]]/g, '')}](${r.url})`).join('\n')}\n`;
};
