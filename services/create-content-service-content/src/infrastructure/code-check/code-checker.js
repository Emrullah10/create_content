import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';
import { parseCodeBlocks, isDiagramBlock } from '../../domain/article/markdown.js';

const run = promisify(execFile);

// Makaledeki kod YALNIZCA sozdizimi acisindan dogrulanir; HICBIR ZAMAN CALISTIRILMAZ.
//  - js/jsx/ts/tsx: typescript derleyicisinin sozdizimi tanilari (dosyasiz, surec ici)
//  - json/yaml: ayristirma;  python: `py_compile` (derler, calistirmaz);  bash: `bash -n` (calistirmaz)
//  - sql ve digerleri: dogrulanamaz -> skipped (hata sayilmaz)
const TS_KIND = { js: 'js', javascript: 'js', mjs: 'js', jsx: 'jsx', ts: 'ts', typescript: 'ts', tsx: 'tsx' };
const FILE = { js: 'snippet.js', jsx: 'snippet.jsx', ts: 'snippet.ts', tsx: 'snippet.tsx' };

export const checkSyntaxInProcess = (kind, code) => {
  const out = ts.transpileModule(code, {
    fileName: FILE[kind],
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, allowJs: true },
  });
  const first = (out.diagnostics || [])[0];
  if (!first) return { ok: true };
  const { line } = first.file && first.start !== undefined ? first.file.getLineAndCharacterOfPosition(first.start) : { line: 0 };
  return { ok: false, error: `line ${line + 1}: ${ts.flattenDiagnosticMessageText(first.messageText, '\n')}` };
};

const viaFile = async (ext, cmd, args, code, timeoutMs) => {
  const dir = await mkdtemp(join(tmpdir(), 'cc-code-'));
  const file = join(dir, `snippet.${ext}`);
  try {
    await writeFile(file, code);
    await run(cmd, [...args, file], { timeout: timeoutMs, env: { PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: '1' } });
    return { ok: true };
  } catch (e) {
    if (e.code === 'ENOENT') return { ok: true, skipped: true, reason: `${cmd} not installed` };
    return { ok: false, error: String(e.stderr || e.message).trim().split('\n').slice(-3).join(' ').slice(0, 300) };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
};

export const checkBlock = async ({ lang, code }, { timeoutMs = 5000 } = {}) => {
  const l = (lang || '').toLowerCase();
  if (TS_KIND[l]) return { ...checkSyntaxInProcess(TS_KIND[l], code), lang: l };
  if (l === 'json') {
    try {
      JSON.parse(code);
      return { ok: true, lang: l };
    } catch (e) {
      return { ok: false, lang: l, error: e.message };
    }
  }
  if (l === 'yaml' || l === 'yml') {
    try {
      parseYaml(code);
      return { ok: true, lang: l };
    } catch (e) {
      return { ok: false, lang: l, error: e.message.split('\n')[0] };
    }
  }
  if (l === 'python' || l === 'py') return { ...(await viaFile('py', 'python3', ['-m', 'py_compile'], code, timeoutMs)), lang: l };
  if (l === 'bash' || l === 'sh' || l === 'shell') return { ...(await viaFile('sh', 'bash', ['-n'], code, timeoutMs)), lang: l };
  return { ok: true, skipped: true, lang: l, reason: 'language not validated' };
};

// -> [{ index, lang, code, ok, skipped?, error? }] (mermaid bloklari atlanir: ayri dogrulanir)
export const checkMarkdownCode = async (markdown, opts) => {
  const blocks = parseCodeBlocks(markdown).filter((b) => !isDiagramBlock(b));
  const results = [];
  for (const [index, b] of blocks.entries()) results.push({ index, ...b, ...(await checkBlock(b, opts)) });
  return results;
};

export const summarizeCodeReport = (results) => {
  const failed = results.filter((r) => !r.ok);
  return { total: results.length, validated: results.filter((r) => !r.skipped).length, failed: failed.length, failures: failed.map((f) => ({ index: f.index, lang: f.lang, error: f.error })) };
};
