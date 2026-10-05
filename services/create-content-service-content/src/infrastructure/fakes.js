import sharp from 'sharp';

// Test/E2E sahteleri: ag yok, deterministik. Uretimde install-ports kurulmayi REDDEDER.
const SOURCE_TEXT = [
  'PostgreSQL implements multiversion concurrency control so that readers never block writers and writers never block readers. ',
  'A vacuum process reclaims storage occupied by dead tuples that are no longer visible to any transaction. ',
  'The planner chooses between a sequential scan and an index scan based on estimated selectivity and cost. ',
].join('').repeat(3);

export const makeFakeResearch = () => ({
  gather: async () => ({
    sources: [
      { kind: 'web', url: 'https://docs.example.test/mvcc', title: 'MVCC explained', text: SOURCE_TEXT },
      { kind: 'github', url: 'https://github.com/example/project', title: 'example/project: README', text: SOURCE_TEXT.replace(/PostgreSQL/g, 'The project') },
    ],
    failures: [],
  }),
});

export const makeFakeRenderer = () => ({
  validateMermaid: async (source) => (/^(flowchart|graph|sequenceDiagram|erDiagram|stateDiagram)/.test(source.trim()) ? { valid: true, error: null } : { valid: false, error: 'Parse error: unknown diagram type' }),
  renderMermaidToPng: async () => sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer(),
  closeBrowser: async () => {},
});
