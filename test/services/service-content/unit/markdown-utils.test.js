import { replacePlaceholder } from '../../../../core/service-content/src/infrastructure/helper/markdown-utils.js';
import { extractPlaceholders, countCodeBlocks } from '../../../../core/service-content/src/domain/entities/article.js';

describe('markdown-utils / article entity helpers', () => {
  test('replacePlaceholder swaps all occurrences', () => {
    expect(replacePlaceholder('a {{X}} b {{X}} c', '{{X}}', 'Y')).toBe('a Y b Y c');
  });

  test('extractPlaceholders finds DIAGRAM_N tokens', () => {
    expect(extractPlaceholders('intro {{DIAGRAM_1}} mid {{DIAGRAM_2}} end')).toEqual(['{{DIAGRAM_1}}', '{{DIAGRAM_2}}']);
  });

  test('countCodeBlocks counts fenced code block pairs', () => {
    const md = '```js\ncode\n```\ntext\n```py\ncode2\n```';
    expect(countCodeBlocks(md)).toBe(2);
  });
});
