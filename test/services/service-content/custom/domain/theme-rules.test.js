import { describe, test, expect } from '@jest/globals';
import { normalizeTags, validateThemeInput } from '../../../../../services/create-content-service-content/src/domain/theme/theme-rules.js';

describe('normalizeTags', () => {
  test('virgüllü metin: küçük harf, tiresiz, tekrarsız', () => {
    expect(normalizeTags('React, Node JS, react, vue-js')).toEqual(['react', 'nodejs', 'vuejs']);
  });
  test('dizi girdisi ve boş değerler', () => {
    expect(normalizeTags(['A!', '', 'b'])).toEqual(['a', 'b']);
    expect(normalizeTags(undefined)).toEqual([]);
  });
  test('en fazla 10 etiket', () => {
    expect(normalizeTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(10);
  });
});

describe('validateThemeInput', () => {
  test('ad zorunlu', () => expect(() => validateThemeInput({ name: '  ' })).toThrow(/name is required/));
  test('kısmi güncellemede ad verilmediyse sorun yok', () => expect(() => validateThemeInput({ weight: 3 }, { partial: true })).not.toThrow());
  test.each([0, 11, 2.5, '3'])('geçersiz ağırlık %p', (weight) => expect(() => validateThemeInput({ name: 'x', weight })).toThrow(/weight/));
});
