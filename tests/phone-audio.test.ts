import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { phoneAudio } from '../apps/web/src/lib/phone-audio';
import recordings from '../apps/web/src/lib/phone-audio.json';

test('samples normalize stress, length and g without flattening other diacritics', () => {
  expect(phoneAudio('ˈiː')).toBe(phoneAudio('i'));
  expect(phoneAudio('g')).toBe(phoneAudio('ɡ'));
  expect(phoneAudio('ĩ')).toBeUndefined();
  expect(phoneAudio('unknown')).toBeUndefined();
});
test('every example is bundled with source and license attribution', () => {
  for (const example of Object.values(recordings)) {
    expect(existsSync(`apps/web/static${example.src}`)).toBe(true);
    expect(example.source).toStartWith('https://commons.wikimedia.org/wiki/File:');
    expect(example.licenseUrl).toContain('creativecommons.org');
    expect(example.author.length).toBeGreaterThan(0);
  }
  for (const phone of ['ɔ', 'x', 'ɜ', 'y', 'ø', 'ç']) expect(phoneAudio(phone)).toBeDefined();
});
