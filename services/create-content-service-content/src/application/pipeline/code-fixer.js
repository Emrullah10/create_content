import { CodeFixSchema } from '../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../infrastructure/llm/prompt-loader.js';
import { summarizeCodeReport } from '../../infrastructure/code-check/code-checker.js';

// Bir markdown'daki [startLine..endLine] kod blogunu yeni kodla degistirir (cit satirlari korunur).
export const replaceCodeBlock = (markdown, { startLine, endLine, lang }, newCode) => {
  const lines = markdown.split('\n');
  return [...lines.slice(0, startLine), `\`\`\`${lang}`, ...newCode.replace(/\r/g, '').replace(/^```\w*\n?|\n?```$/g, '').split('\n'), '```', ...lines.slice(endLine + 1)].join('\n');
};

// Sozdizimi hatali kod bloklarini bolum bazinda dogrular; hata mesajini modele geri besleyerek (utility rolu) en fazla
// `rounds` tur duzeltir. Kod HICBIR ZAMAN calistirilmaz. Donus: { sections (guncel), changed:[sectionId], summary }.
export const makeCodeFixer = ({ ask, checkCode, sectionRepo, nowFn = () => new Date() }) => async ({ articleId, sections, rounds = 2 }) => {
  let current = sections;
  const changed = new Set();
  let results = [];
  for (let round = 0; round <= rounds; round += 1) {
    results = [];
    for (const s of current) results.push(...(await checkCode(s.body)).map((r) => ({ ...r, sectionId: s.id, heading: s.heading })));
    const failed = results.filter((r) => !r.ok);
    if (!failed.length || round === rounds) break;
    const next = [];
    for (const s of current) {
      let body = s.body;
      // Sondan basa: satir indeksleri bozulmasin.
      for (const f of failed.filter((x) => x.sectionId === s.id).sort((a, b) => b.startLine - a.startLine)) {
        try {
          const { data } = await ask({ stage: 'code-fix', articleId, prompt: renderPrompt('code-fix', { language: f.lang, error: f.error, code: f.code }), schema: CodeFixSchema, schemaName: 'code_fix', temperature: 0.1, maxTokens: 1500, meta: { code: f.code } });
          body = replaceCodeBlock(body, f, data.code);
        } catch {
          /* duzeltilemezse blok oldugu gibi kalir; rapor hatayi gosterir */
        }
      }
      if (body !== s.body) {
        changed.add(s.id);
        await sectionRepo.setBody({ sectionId: s.id, body, wordCount: body.split(/\s+/).length, now: nowFn() });
      }
      next.push({ ...s, body });
    }
    current = next;
  }
  return { sections: current, changed: [...changed], summary: summarizeCodeReport(results) };
};
