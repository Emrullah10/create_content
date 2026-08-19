import { isDuplicateTitle } from '../../../../core/service-content/src/domain/policies/dedup-policy.js';
import { computeDedupHash } from '../../../../core/service-content/src/domain/entities/topic.js';

describe('dedup-policy: isDuplicateTitle', () => {
  test('detects a duplicate regardless of case/whitespace', () => {
    const existing = [computeDedupHash('Clean Architecture in Node.js')];
    expect(isDuplicateTitle('  clean architecture in node.js  ', existing)).toBe(true);
  });

  test('returns false for a new title', () => {
    const existing = [computeDedupHash('Some other title')];
    expect(isDuplicateTitle('A brand new title', existing)).toBe(false);
  });
});
