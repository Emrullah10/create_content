// SAHTE LLM: test/E2E icin deterministik, ag erisimsiz. Uretimde kurulmayi reddeder (install-from-env).
// Gercek adaptorle ayni complete() imzasini kullanir; `request.meta` yalniz sahte adaptor icin yapilandirilmis girdi tasir.
const filler = (n, seed) =>
  Array.from({ length: n }, (_, i) => `${['practical', 'measured', 'careful', 'explicit', 'bounded', 'observable'][i % 6]}${seed}${i % 17}`).join(' ');

const sentence = (n, seed) => `${filler(n, seed)}.`;

const CODE = {
  javascript: 'const total = items.reduce((sum, item) => sum + item.price, 0);\nconsole.log(total);',
  typescript: 'const total = (items: { price: number }[]): number => items.reduce((sum, item) => sum + item.price, 0);',
  python: 'def total(items):\n    return sum(item["price"] for item in items)',
  bash: 'set -euo pipefail\necho "ready"',
  sql: 'SELECT id, created_at FROM orders WHERE status = $1 ORDER BY created_at DESC LIMIT 20;',
  json: '{ "retries": 3, "timeoutSeconds": 5 }',
  yaml: 'retries: 3\ntimeoutSeconds: 5',
};
const DIAGRAM = {
  flowchart: 'flowchart TD\n  A[Request] --> B{Cache hit}\n  B -->|yes| C[Serve]\n  B -->|no| D[Load]',
  sequenceDiagram: 'sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: request\n  S-->>C: response',
  erDiagram: 'erDiagram\n  USER ||--o{ ORDER : places\n  USER {\n    int id\n  }\n  ORDER {\n    int id\n  }',
  'stateDiagram-v2': 'stateDiagram-v2\n  [*] --> Draft\n  Draft --> Review\n  Review --> [*]',
};

// Her bolum basligina ozgu tohum: farkli bolumler birebir ayni metni uretmesin (tekrar-paragraf kontrolu gercek bir hatayi yakalar).
const seedOf = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);

const sectionText = ({ heading = 'Section', targetWords = 250, codePlan, diagramPlan, tableHint, kind }) => {
  const seed = seedOf(heading);
  const parts = [sentence(Math.max(40, Math.round(targetWords * 0.55)), `a${seed}x`)];
  if (codePlan) parts.push(`\`\`\`${codePlan.language}\n${CODE[codePlan.language] || CODE.javascript}\n\`\`\``);
  if (diagramPlan) parts.push(`\`\`\`mermaid\n${DIAGRAM[diagramPlan.type] || DIAGRAM.flowchart}\n\`\`\`\n*Figure: ${diagramPlan.shows}*`);
  if (tableHint) parts.push('| Option | Cost | Risk |\n|---|---|---|\n| A | low | stale reads |\n| B | high | slower writes |');
  parts.push(sentence(Math.max(30, Math.round(targetWords * 0.35)), `b${seed}${kind || 'x'}`));
  return parts.join('\n\n');
};

// Birbirinden gercekten farkli basliklar: benzerlik (pg_trgm) denetimi sahte konulari da eler.
const FAKE_TOPIC_TITLES = [
  'Partial indexes are the cheapest speedup you are not using',
  'Connection pooling traps behind a transaction-mode pgbouncer',
  'Vacuum tuning for append-only tables with huge retention',
  'Why your JSONB column needs a generated index before it needs a rewrite',
  'Choosing between LISTEN/NOTIFY and a job queue for small services',
  'Reading EXPLAIN ANALYZE output without guessing at the planner',
];

const OUTLINE = (title) => ({
  title,
  subtitle: 'A practical, opinionated walkthrough',
  summary: 'Defends a concrete position with mechanisms, trade-offs and code.',
  tags: ['nodejs', 'backend', 'architecture'],
  thesis: 'Explicit boundaries beat clever abstractions in small services.',
  coverPrompt: 'Isometric servers connected by thin lines on a dark gradient background',
  sections: [
    { kind: 'intro', heading: 'Introduction', goal: 'Hook and thesis', factIds: [], targetWords: 150, codePlan: null, diagramPlan: null, tableHint: null },
    { kind: 'body', heading: 'The core mechanism', goal: 'Explain the mechanism', factIds: ['F1'], targetWords: 300, codePlan: { language: 'javascript', shows: 'the mechanism' }, diagramPlan: { type: 'flowchart', shows: 'how a request flows through the system' }, tableHint: null },
    { kind: 'body', heading: 'Where it breaks', goal: 'Failure scenarios', factIds: [], targetWords: 300, codePlan: { language: 'sql', shows: 'a failing query' }, diagramPlan: null, tableHint: null },
    { kind: 'body', heading: 'Options compared', goal: 'Compare options', factIds: [], targetWords: 300, codePlan: { language: 'python', shows: 'an alternative' }, diagramPlan: { type: 'sequenceDiagram', shows: 'the two request paths side by side' }, tableHint: 'compares the options by cost and risk' },
    { kind: 'body', heading: 'Putting it into practice', goal: 'Concrete steps', factIds: [], targetWords: 300, codePlan: { language: 'bash', shows: 'a deploy step' }, diagramPlan: null, tableHint: null },
    { kind: 'counterpoint', heading: 'The strongest objection', goal: 'Counterpoint', factIds: [], targetWords: 260, codePlan: null, diagramPlan: null, tableHint: null },
    { kind: 'conclusion', heading: 'A decision rule', goal: 'Checklist', factIds: [], targetWords: 150, codePlan: null, diagramPlan: null, tableHint: null },
  ],
});

// Sahte kaynak metninden birebir bir alinti secer (gercek akistaki "alinti kaynakta gecmeli" kuralini saglar).
const quoteFrom = (text) => {
  const m = /[A-Z][^.\n]{30,200}\./.exec(text || '');
  return m ? m[0].trim() : null;
};

export const makeFakeLlm = ({ recorder, overrides = {} } = {}) => {
  const calls = [];
  const handlers = {
    topics: (r) => ({ topics: Array.from({ length: r.meta?.count ?? 3 }, (_, i) => ({ title: FAKE_TOPIC_TITLES[i % FAKE_TOPIC_TITLES.length], angle: 'Defends a concrete position against the common advice.', keywords: ['fake', 'topic'] })) }),
    'research-plan': () => ({ queries: ['fake query'], docUrls: [], wikipediaTitles: [] }),
    'research-facts': (r) => {
      const quote = quoteFrom(r.meta?.sourceText);
      return { facts: quote ? [{ claim: 'The source states a verifiable behaviour.', quote }] : [] };
    },
    outline: (r) => OUTLINE(r.meta?.title || 'Fake article'),
    section: (r) => sectionText(r.meta || {}),
    'revise-section': (r) => r.meta?.body ?? sentence(120, 'rev'),
    editor: () => ({ issues: [] }),
    judge: () => ({
      technical_depth_reasoning: 'Two trade-offs and one failure scenario are described.', technical_depth: 4,
      structural_richness_reasoning: 'Diagrams, code and a table are present.', structural_richness: 4,
      clarity_reasoning: 'Clear progression.', clarity: 4,
      originality_reasoning: 'A defended position with a separate counterpoint.', originality: 4,
      strengths: ['Specific', 'Well structured'], weaknesses: ['Could use more measurements'],
    }),
    'code-fix': (r) => ({ code: r.meta?.code ?? 'const ok = true;' }),
    'diagram-repair': () => ({ mermaid: DIAGRAM.flowchart }),
    ...overrides,
  };

  const complete = async (request) => {
    const started = Date.now();
    const handler = handlers[request.stage];
    if (!handler) throw new Error(`fake LLM has no handler for stage "${request.stage}"`);
    const out = handler(request);
    calls.push({ stage: request.stage, role: request.role || 'writer', prompt: request.prompt });
    const isJson = Boolean(request.schema);
    const data = isJson ? request.schema.parse(out) : undefined;
    const text = isJson ? JSON.stringify(out) : String(out);
    const usage = { inputTokens: Math.ceil(request.prompt.length / 4), outputTokens: Math.ceil(text.length / 4) };
    try {
      await recorder?.({ role: request.role || 'writer', stage: request.stage ?? null, articleId: request.articleId ?? null, model: 'fake', durationMs: Date.now() - started, status: 'ok', ...usage });
    } catch {
      /* best-effort */
    }
    return { text, data, usage, model: 'fake', durationMs: Date.now() - started };
  };

  return { complete, describe: () => ({ writer: { model: 'fake' }, judge: { model: 'fake' }, utility: { model: 'fake' } }), calls, handlers };
};
