import { describe, test, expect } from '@jest/globals';
import { apiErrorKey, apiErrorMessage, formatDuration, scoreColor, splitTags, formatDateTime } from '../format.js';

describe('format yardımcıları', () => {
  test('formatDuration', () => {
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(4200)).toBe('4s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
  test('scoreColor eşikleri', () => {
    expect([scoreColor(90), scoreColor(75), scoreColor(65), scoreColor(30), scoreColor(null)]).toEqual(['success', 'success', 'warning', 'error', 'default']);
  });
  test('splitTags', () => expect(splitTags(' a, b ,,c ')).toEqual(['a', 'b', 'c']));
  test('formatDateTime boş değer', () => expect(formatDateTime(null)).toBe('-'));

  const err = (code, message) => ({ response: { data: { error: { code, message } } }, message: 'Request failed' });
  const t = (key, opts) => ({ 'apiErrors.TOPIC_QUEUE_FULL': 'Kuyruk dolu', 'apiErrors.UNKNOWN': 'Bilinmeyen' }[key] ?? opts?.defaultValue ?? '');
  test('apiErrorKey', () => {
    expect(apiErrorKey(err('X'))).toBe('apiErrors.X');
    expect(apiErrorKey(new Error('net'))).toBeNull();
  });
  test('çevirisi olan kod çevrilir; olmayan ham mesaja düşer; kodsuz hata UNKNOWN/mesaj', () => {
    expect(apiErrorMessage(err('TOPIC_QUEUE_FULL', 'raw'), t)).toBe('Kuyruk dolu');
    expect(apiErrorMessage(err('NO_SUCH_CODE', 'raw backend message'), t)).toBe('raw backend message');
    expect(apiErrorMessage(new Error('Network Error'), t)).toBe('Network Error');
    expect(apiErrorMessage({}, t)).toBe('Bilinmeyen');
  });
});
