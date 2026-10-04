import { sanitizeTagsForDevto } from '../../../../core/service-content/src/domain/policies/tag-policy.js';

describe('tag-policy: sanitizeTagsForDevto', () => {
  test('lowercases and strips hyphens, matching dev.to silent behavior', () => {
    expect(sanitizeTagsForDevto(['Machine-Learning'])).toEqual(['machinelearning']);
  });

  test('deduplicates and caps at 4 tags', () => {
    const tags = ['nodejs', 'NodeJS', 'react', 'ai', 'postgres', 'docker'];
    const result = sanitizeTagsForDevto(tags);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('nodejs');
  });

  test('drops empty tags after sanitization', () => {
    expect(sanitizeTagsForDevto(['---', 'valid'])).toEqual(['valid']);
  });
});
