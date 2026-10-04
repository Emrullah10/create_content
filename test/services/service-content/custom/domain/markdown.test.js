import { describe, test, expect } from '@jest/globals';
import { parseCodeBlocks, countCodeBlocks, countDiagramBlocks, wordCount, hasTable, extractLinks, removeLink, slugify, extractDiagrams, embedAssets, extractPlaceholders } from '../../../../../services/create-content-service-content/src/domain/article/markdown.js';
import { assembleBody } from '../../../../../services/create-content-service-content/src/domain/article/section-markdown.js';

const md = [
  '## One',
  'Some prose here.',
  '```js',
  'const a = 1;',
  '```',
  '',
  '```mermaid',
  'flowchart TD',
  '  A --> B',
  '```',
  '*Figure: A flows to B*',
  '',
  'After the diagram. [Docs](https://example.com/docs) and https://example.org/x.',
].join('\n');

describe('code blocks', () => {
  test('parses lang and body', () => {
    const blocks = parseCodeBlocks(md);
    expect(blocks.map((b) => b.lang)).toEqual(['js', 'mermaid']);
    expect(blocks[0].code).toBe('const a = 1;');
  });
  test('counts exclude mermaid', () => {
    expect(countCodeBlocks(md)).toBe(1);
    expect(countDiagramBlocks(md)).toBe(1);
  });
  test('unterminated fence is ignored', () => {
    expect(parseCodeBlocks('```js\nnever closed')).toEqual([]);
  });
});

describe('prose metrics', () => {
  test('wordCount ignores code and link targets', () => {
    expect(wordCount('Hello [world](https://x.io/very/long) there\n```js\nlots of code words here\n```')).toBe(3);
  });
  test('hasTable', () => {
    expect(hasTable('| a | b |\n|---|---|\n| 1 | 2 |')).toBe(true);
    expect(hasTable('no table | here')).toBe(false);
  });
});

describe('links', () => {
  test('extractLinks finds markdown and bare links, not images', () => {
    expect(extractLinks(md + '\n![img](https://img.example/a.png)').sort()).toEqual(['https://example.com/docs', 'https://example.org/x']);
  });
  test('removeLink keeps the anchor text', () => {
    expect(removeLink('See [Docs](https://example.com/docs) now', 'https://example.com/docs')).toBe('See Docs now');
  });
});

describe('slugify', () => {
  test.each([['Hello, World! 2026', 'hello-world-2026'], ['Çok Özel Başlık', 'cok-ozel-baslik'], ['!!!', 'article']])('%s', (i, o) => expect(slugify(i)).toBe(o));
});

describe('diyagram çıkarma ve gömme', () => {
  test('mermaid bloğu yer tutucuya çevrilir, Figure satırı caption olur', () => {
    const { markdown, diagrams } = extractDiagrams(md);
    expect(diagrams).toEqual([{ key: 'DIAGRAM_1', source: 'flowchart TD\n  A --> B', caption: 'A flows to B' }]);
    expect(extractPlaceholders(markdown)).toEqual(['DIAGRAM_1']);
    expect(markdown).not.toContain('mermaid');
    expect(markdown).not.toContain('Figure:');
    expect(markdown).toContain('\n\n{{DIAGRAM_1}}\n\n');
  });
  test('startIndex ile numaralandırma', () => {
    expect(extractDiagrams('```mermaid\nA-->B\n```', { startIndex: 3 }).diagrams[0].key).toBe('DIAGRAM_3');
  });
  test('gömme: yüklenen görsel markdown olur, başarısızın yer tutucusu temizlenir', () => {
    const body = 'a\n\n{{DIAGRAM_1}}\n\nb\n\n{{DIAGRAM_2}}\n\nc';
    const out = embedAssets(body, [{ key: 'DIAGRAM_1', url: 'https://cdn/x.png', alt: 'alt', caption: 'cap' }, { key: 'DIAGRAM_2', url: null }]);
    expect(out).toContain('![alt](https://cdn/x.png)\n\n*cap*');
    expect(out).not.toContain('{{');
    expect(out).not.toMatch(/\n{3,}/);
  });
});

describe('assembleBody', () => {
  test('sıraya göre birleştirir, girişin başlığı yok', () => {
    const body = assembleBody([
      { position: 2, kind: 'body', heading: 'B', body: 'two' },
      { position: 1, kind: 'intro', heading: 'Intro', body: 'one' },
    ]);
    expect(body).toBe('one\n\n## B\n\ntwo');
  });
});
