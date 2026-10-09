import { findBannedPhrases, findLeftovers, findUnsupportedNumbers, DEFAULT_THRESHOLDS } from './quality-checks.js';
import { countCodeBlocks, countDiagramBlocks, hasTable, wordCount } from './markdown.js';

// Kalite kontrolu basarisizliklarini BOLUM BAZLI duzeltme gorevlerine cevirir (redaktor LLM'inin sorunlariyla birlestirilir).
// sections: [{ position, kind, heading, body, plan }]. Intro basligi 'INTRO' olarak adlandirilir.
export const headingKey = (s) => (s.kind === 'intro' ? 'INTRO' : s.heading);

export const issuesFromChecks = ({ checkResult, sections, allowedText = '', thresholds = {} }) => {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const issues = [];
  const add = (section, problem, fix) => issues.push({ sectionHeading: headingKey(section), problem, fix, severity: 'high', source: 'check' });
  const failed = new Set(checkResult.errors.map((e) => e.id));
  const bodies = sections.filter((s) => s.kind === 'body' || s.kind === 'counterpoint');

  if (failed.has('word-count')) {
    const total = checkResult.metrics.words;
    if (total < t.minWords) {
      const deficit = t.minWords - total;
      const shortest = [...bodies].sort((a, b) => wordCount(a.body) - wordCount(b.body)).slice(0, Math.min(3, bodies.length));
      for (const s of shortest) add(s, `Article is ${deficit} words short of the ${t.minWords}-word minimum and this section is among the thinnest.`, `Add about ${Math.ceil(deficit / shortest.length)} words of concrete mechanism, an example, or a failure mode. Do not add filler or new statistics.`);
    }
  }
  if (failed.has('code-blocks')) {
    for (const s of sections.filter((x) => x.plan?.codePlan && countCodeBlocks(x.body) === 0)) add(s, `The plan calls for a ${s.plan.codePlan.language} code example (${s.plan.codePlan.shows}) but the section has none.`, 'Add the planned code block: complete, minimal, syntactically valid.');
  }
  if (failed.has('diagrams')) {
    for (const s of sections.filter((x) => x.plan?.diagramPlan && countDiagramBlocks(x.body) === 0)) add(s, `The plan calls for a ${s.plan.diagramPlan.type} diagram (${s.plan.diagramPlan.shows}) but the section has none.`, 'Add the planned mermaid diagram followed by a `*Figure: ...*` caption line.');
  }
  if (!hasTable(sections.map((s) => s.body).join('\n\n')) && checkResult.warnings.some((w) => w.id === 'table')) {
    const host = sections.find((s) => s.plan?.tableHint);
    if (host) issues.push({ sectionHeading: headingKey(host), problem: 'The planned comparison table is missing.', fix: `Add a markdown table that ${host.plan.tableHint}.`, severity: 'medium', source: 'check' });
  }
  if (failed.has('unsupported-numbers')) {
    for (const s of sections) {
      const bad = findUnsupportedNumbers(s.body, allowedText).filter((u) => u.strong);
      if (bad.length) add(s, `Unsourced figures: ${bad.map((b) => b.text).join(', ')}.`, 'Remove these figures or restate them qualitatively. Only figures from the source facts or the author notes are allowed.');
    }
  }
  if (failed.has('banned-phrases')) {
    for (const s of sections) {
      const hits = findBannedPhrases(s.body);
      if (hits.length) add(s, `Cliché or template phrasing: ${hits.join(', ')}.`, 'Rewrite those sentences in plain, specific language.');
    }
  }
  if (failed.has('duplicate-paragraphs')) {
    const seen = new Map();
    for (const s of sections) {
      for (const p of s.body.split(/\n{2,}/).filter((x) => x.split(/\s+/).length > 25)) {
        const key = p.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3).slice(0, 12).join(' ');
        if (seen.has(key) && seen.get(key) !== s.position) add(s, 'A paragraph repeats an idea already written in another section.', 'Replace the repeated paragraph with new, section-specific content.');
        else seen.set(key, s.position);
      }
    }
  }
  if (failed.has('leftovers')) {
    for (const s of sections.filter((x) => findLeftovers(x.body).length || /\{\{(?!DIAGRAM_)/.test(x.body))) add(s, 'Leftover markers (TODO/placeholder text).', 'Remove or complete the unfinished text.');
  }
  return issues;
};

// Ayni bolume dusen sorunlari birlestirir: heading -> [issues]
export const groupIssuesBySection = (issues, sections) => {
  const byKey = new Map(sections.map((s) => [headingKey(s).toLowerCase(), s]));
  const grouped = new Map();
  const unmatched = [];
  for (const issue of issues) {
    const section = byKey.get(String(issue.sectionHeading).trim().toLowerCase());
    if (!section) { unmatched.push(issue); continue; }
    if (!grouped.has(section.position)) grouped.set(section.position, { section, issues: [] });
    grouped.get(section.position).issues.push(issue);
  }
  return { groups: [...grouped.values()], unmatched };
};
