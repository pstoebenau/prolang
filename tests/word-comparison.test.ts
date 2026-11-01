import { expect, test } from 'bun:test';
import { compareWords } from '../apps/web/src/lib/word-comparison';
test('ignores case and punctuation without collapsing German letters', () => {
  expect(compareWords('Hallo, schön!', 'hallo schön').every(w => w.matches)).toBe(true);
  expect(compareWords('schön', 'schon')[0].matches).toBe(false);
});
test('aligns missing and extra words without shifting later matches', () => {
  expect(compareWords('wie geht es dir', 'wie es dir')).toEqual([
    { expected: 'wie', detected: 'wie', matches: true },
    { expected: 'geht', detected: '', matches: false },
    { expected: 'es', detected: 'es', matches: true },
    { expected: 'dir', detected: 'dir', matches: true },
  ]);
  expect(compareWords('Hallo', 'Hallo du')[1]).toEqual({ expected: '', detected: 'du', matches: false });
});
test('reports substitutions and empty recordings', () => {
  expect(compareWords('die Katze', 'die Tasche')[1]).toEqual({ expected: 'Katze', detected: 'Tasche', matches: false });
  expect(compareWords('Hallo', '')[0].matches).toBe(false);
});
test('accepts ASR sharp-s spelling while preserving the original text', () => {
  expect(compareWords('die Großmutter', 'die grossmutter')[1]).toEqual({ expected: 'Großmutter', detected: 'grossmutter', matches: true });
  expect(compareWords('GROẞMUTTER', 'grossmutter')[0].matches).toBe(true);
  expect(compareWords('Großmutter', 'Großvater')[0].matches).toBe(false);
});
