import { expect, test } from 'bun:test';
import { comparePhones } from '../apps/web/src/lib/phone-comparison';

test('insertions and deletions do not shift the following word', () => {
  const groups = [
    ['d', 'i'],
    ['t', 'ɔ', 'x', 't', 'ɜ'],
  ];
  const insertion = comparePhones(groups, [
    'd',
    'i',
    'ə',
    't',
    'ɔ',
    'x',
    't',
    'ɜ',
  ])!;
  expect(insertion[0].differences).toEqual([{ expected: '', heard: 'ə' }]);
  expect(insertion[1].severity).toBe(0);
  const deletion = comparePhones(groups, ['d', 't', 'ɔ', 'x', 't', 'ɜ'])!;
  expect(deletion[0].differences).toEqual([{ expected: 'i', heard: '' }]);
  expect(deletion[1].severity).toBe(0);
});

test('multi-character IPA tokens remain intact and repetitions retain position', () => {
  const result = comparePhones(
    [
      ['j', 'aː'],
      ['j', 'aː'],
    ],
    ['j', 'aː', 'j', 'ə'],
  )!;
  expect(result[0].severity).toBe(0);
  expect(result[1].differences).toEqual([{ expected: 'aː', heard: 'ə' }]);
});

test('empty recognition means missing sounds, absent reference has no comparison', () => {
  expect(comparePhones([['j', 'a']], [])![0].severity).toBe(1);
  expect(comparePhones([], ['a'])).toBeUndefined();
});

test('word playback spans follow aligned recorded phones, not equal word lengths', () => {
  const result = comparePhones(
    [
      ['d', 'i'],
      ['t', 'a'],
    ],
    ['d', 'e', 't', 'a'],
    [
      { start: 0.1, end: 0.15 },
      { start: 0.16, end: 0.3 },
      { start: 0.6, end: 0.7 },
      { start: 0.71, end: 1.2 },
    ],
  )!;
  expect(result[0].segment).toEqual({ start: 0.1, end: 0.3 });
  expect(result[1].segment).toEqual({ start: 0.6, end: 1.2 });
  expect(comparePhones([['a']], [], [])![0].segment).toBeUndefined();
  expect(comparePhones([['a']], ['a'], [])![0].segment).toBeUndefined();
  expect(
    comparePhones([['a']], ['a'], [{ start: 1, end: 0.5 }])![0].segment,
  ).toBeUndefined();
});
