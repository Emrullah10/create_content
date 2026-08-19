import { meetsMinimumStructure, MIN_WORD_COUNT } from '../../../../core/service-content/src/domain/policies/quality-policy.js';

const makeBody = ({ words = 1200, diagrams = 2, codeBlocks = 3 }) => {
  const filler = Array(words).fill('word').join(' ');
  const placeholders = Array.from({ length: diagrams }, (_, i) => `{{DIAGRAM_${i + 1}}}`).join(' ');
  const code = Array.from({ length: codeBlocks }, () => '```js\ncode\n```').join('\n');
  return `${filler}\n${placeholders}\n${code}`;
};

describe('quality-policy: meetsMinimumStructure', () => {
  test('passes when diagrams, code blocks, and word count all meet minimums', () => {
    const bodyMarkdown = makeBody({ words: MIN_WORD_COUNT + 200, diagrams: 2, codeBlocks: 3 });
    expect(meetsMinimumStructure({ diagramCount: 2, bodyMarkdown })).toBe(true);
  });

  test('fails when article is under the minimum word count even with enough diagrams/code', () => {
    const bodyMarkdown = makeBody({ words: 500, diagrams: 2, codeBlocks: 3 });
    expect(meetsMinimumStructure({ diagramCount: 2, bodyMarkdown })).toBe(false);
  });

  test('fails when diagram count is below minimum regardless of length', () => {
    const bodyMarkdown = makeBody({ words: MIN_WORD_COUNT + 200, diagrams: 1, codeBlocks: 3 });
    expect(meetsMinimumStructure({ diagramCount: 1, bodyMarkdown })).toBe(false);
  });
});
