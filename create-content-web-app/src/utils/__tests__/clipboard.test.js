import { describe, test, expect, jest } from '@jest/globals';
import { copyText } from '../clipboard.js';

describe('copyText', () => {
  test('senkron execCommand yolu çalışırsa clipboard API çağrılmaz', async () => {
    document.execCommand = jest.fn(() => true);
    const clipboard = { writeText: jest.fn() };
    expect(await copyText('https://dev.to/x', { clipboard })).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(document.querySelector('textarea')).toBeNull(); // geçici alan temizlendi
  });
  test('execCommand başarısızsa clipboard API yedeğine düşer', async () => {
    document.execCommand = jest.fn(() => false);
    const clipboard = { writeText: jest.fn(async () => {}) };
    expect(await copyText('https://dev.to/x', { clipboard })).toBe(true);
    expect(clipboard.writeText).toHaveBeenCalledWith('https://dev.to/x');
  });
  test('ikisi de başarısızsa (odak yok / güvensiz bağlam) false döner, hata fırlatmaz', async () => {
    document.execCommand = jest.fn(() => false);
    expect(await copyText('u', { clipboard: { writeText: async () => { throw new Error('Document is not focused'); } } })).toBe(false);
    expect(await copyText('u', { clipboard: undefined })).toBe(false);
    expect(await copyText('', {})).toBe(false);
  });
});
