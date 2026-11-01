import { expect, test } from 'bun:test';
import { practiceWords } from '../apps/web/src/lib/practice-feedback';
test('a transcript mismatch alone cannot establish a pronunciation error', () => {
  const rows = practiceWords('die Katze', {
    transcribe: 'das Katze',
    differences: {
      expected_phones: [
        ['d', 'i'],
        ['k', 'a', 't', 's', 'ə'],
      ],
      errors: [],
    },
  });
  expect(rows[0].label).toBe('Transcript differs');
  expect(rows[0].severity).toBeNull();
  expect(rows[1].severity).toBeNull();
});
test('repeated words use zero-based word positions and normalized distance', () => {
  const rows = practiceWords('ja ja', {
    transcribe: 'ja ja',
    differences: {
      expected_phones: [
        ['j', 'a'],
        ['j', 'a'],
      ],
      errors: [{ word: 'ja', position: 1, phone_distance: 1 }],
    },
  });
  expect(rows[0].severity).toBeNull();
  expect(rows[1].severity).toBe(0.5);
});
test('unknown severity stays neutral for extra and missing transcript words', () => {
  expect(
    practiceWords('ja', {
      transcribe: 'ja',
      differences: { errors: [{ word: 'ja', position: 0 }] },
    })[0].severity,
  ).toBeNull();
  expect(practiceWords('ja', { transcribe: '' })[0].severity).toBeNull();
  expect(practiceWords('ja', { transcribe: 'ja nein' })[1].label).toBe(
    'Extra transcript word',
  );
});
test('sharp-s transcript variants proceed to pronunciation assessment', () => {
  const result = practiceWords('Großmutter', {
    transcribe: 'grossmutter',
    differences: {
      expected_phones: [['ɡ', 'ʁ', 'oː', 's', 'm', 'ʊ', 't', 'ɐ']],
      errors: [{ word: 'grossmutter', position: 0, phone_distance: 2 }],
    },
  })[0];
  expect(result.matches).toBe(true);
  expect(result.label).toBe('Sound differs');
  expect(result.severity).toBe(0.25);
});

test('raw differences are compared even without model warnings (die Tochter)', () => {
  const result = practiceWords('die Tochter', {
    transcribe: 'die tochter',
    differences: {
      expected_phones: [
        ['d', 'i'],
        ['t', 'ɔ', 'x', 't', 'ɜ'],
      ],
      heard_phones: ['d', 'i', 't', 'o', 'k', 'd', 'a'],
      errors: [],
    },
  })[1];
  expect(result.label).toBe('Sound differs');
  expect(result.severity).toBe(0.8);
  expect(result.heardPhones).toEqual(['t', 'o', 'k', 'd', 'a']);
});

test('exact recognized phones supply word IPA and match status', () => {
  const result = practiceWords('die Tochter', {
    transcribe: 'die tochter',
    differences: {
      expected_phones: [
        ['d', 'i'],
        ['t', 'ɔ', 'x', 't', 'ɜ'],
      ],
      heard_phones: ['d', 'i', 't', 'ɔ', 'x', 't', 'ɜ'],
      errors: [],
    },
  })[1];
  expect(result.label).toBe('Recognized phones match');
  expect(result.severity).toBe(0);
  expect(result.heardPhones).toEqual(['t', 'ɔ', 'x', 't', 'ɜ']);
});

test('missing assessment data cannot imply matching sounds', () => {
  const result = practiceWords('ja', { transcribe: 'ja' })[0];
  expect(result.label).toBe('Not assessed');
  expect(result.severity).toBeNull();
});

test('article mismatch does not hide the final vowel difference in Tochter', () => {
  const result = practiceWords('die Tochter', {
    transcribe: 'der tochter',
    differences: {
      expected_phones: [
        ['d', 'i'],
        ['t', 'ɔ', 'x', 't', 'ɜ'],
      ],
      heard_phones: ['d', 'e', 't', 'ɔ', 'x', 't', 'a'],
      errors: [],
    },
  });
  expect(result[0].label).toBe('Sound differs');
  expect(result[0].severity).toBe(0.5);
  expect(result[1].label).toBe('Sound differs');
  expect(result[1].heardPhones).toEqual(['t', 'ɔ', 'x', 't', 'a']);
  expect(result[1].severity).toBe(0.2);
  expect(result[1].phoneDifferences).toEqual([{ expected: 'ɜ', heard: 'a' }]);
});

test('misrecognized word retains its actual sound differences, not a full penalty', () => {
  const result = practiceWords('Katze', {
    transcribe: 'Kasse',
    differences: {
      expected_phones: [['k', 'a', 'ts', 'ə']],
      heard_phones: ['k', 'a', 's', 'ə'],
      errors: [],
    },
  })[0];
  expect(result.matches).toBe(false);
  expect(result.detected).toBe('Kasse');
  expect(result.severity).toBe(0.25);
  expect(result.label).toBe('Sound differs');
  expect(result.phonePairs?.[2]).toEqual({ expected: 'ts', heard: 's' });
});

test('matching sounds survive a different or missing transcript', () => {
  for (const transcribe of ['Kasse', '']) {
    const result = practiceWords('Katze', {
      transcribe,
      differences: {
        expected_phones: [['k', 'a', 'ts', 'ə']],
        heard_phones: ['k', 'a', 'ts', 'ə'],
      },
    })[0];
    expect(result.severity).toBe(0);
    expect(result.label).toBe('Recognized phones match');
  }
});

test('genuinely different recognized sounds remain different despite transcript uncertainty', () => {
  const result = practiceWords('Katze', {
    transcribe: 'Hund',
    differences: {
      expected_phones: [['k', 'a', 'ts', 'ə']],
      heard_phones: ['h', 'ʊ', 'n', 't'],
    },
  })[0];
  expect(result.severity).toBe(1);
  expect(result.label).toBe('Sound differs');
});
