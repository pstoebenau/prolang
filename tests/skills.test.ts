import { test, expect } from 'bun:test';
import { Store } from '../apps/web/src/lib/server/store';
import { passages } from '../apps/web/src/lib/skills/passages';
import {
  readingProgress,
  type ReadingAttempt,
} from '../apps/web/src/lib/skills/progression';
import {
  vocabulary,
  vocabularyProgress,
  answerCorrect,
} from '../apps/web/src/lib/skills/vocabulary';
function attempts(ids: string[], scores: number[]): ReadingAttempt[] {
  return ids.map((id, i) => {
    const p = passages.find((p) => p.id === id)!;
    return {
      id: crypto.randomUUID(),
      passageId: id,
      at: new Date(2026, 0, 1, 0, i).toISOString(),
      target: p.text,
      level: p.level,
      placement: !!p.placement,
      feedback: { score: scores[i] },
    };
  });
}
test('reading placement and promotion require evidence across different passages', () => {
  const base = attempts(
    ['placement-0', 'placement-1', 'placement-2'],
    [85, 60, 90],
  );
  expect(readingProgress(base).level).toBe(1);
  expect(readingProgress(base).placed).toBe(true);
  const repeated = attempts(
    ['journey', 'journey', 'journey'],
    [90, 90, 90],
  ).map((a) => ({ ...a, at: a.at.replace('01T', '02T') }));
  expect(readingProgress([...base, ...repeated]).level).toBe(1);
  const varied = attempts(['journey', 'course', 'move'], [80, 90, 85]).map(
    (a) => ({ ...a, at: a.at.replace('01T', '02T') }),
  );
  expect(readingProgress([...base, ...varied]).level).toBe(2);
  expect(
    readingProgress([
      ...base,
      ...varied.map((a) => ({ ...a, feedback: { score: 40 } })),
    ]).level,
  ).toBe(0);
});
test('skill history backs up without audio and old backups reset new history', () => {
  const s = new Store(':memory:');
  const a = s.readingAttempt(
    'morning',
    { score: 80 },
    { data: new Uint8Array([1, 2]), mime: 'audio/wav' },
  );
  expect(s.readingRecording(a.id)?.data).toEqual(new Uint8Array([1, 2]));
  expect(s.all().every((c) => c.card.reps === 0)).toBe(true);
  const b = s.export();
  s.restore(b);
  expect(s.readingHistory()).toHaveLength(1);
  expect(s.readingRecording(a.id)).toBeNull();
  expect(() => s.restore({ ...b, reading: [{ ...a, level: 3 }] })).toThrow();
  expect(s.readingHistory()).toHaveLength(1);
  const { reading, vocabulary, ...legacy } = b;
  s.restore(legacy);
  expect(s.readingHistory()).toHaveLength(0);
  s.db.close();
});
test('vocabulary uses server-scored one-time samples with balanced bands', () => {
  const s = new Store(':memory:');
  const session = s.startVocabulary('recall');
  expect(session.questions).toHaveLength(16);
  const answers = session.questions.map(
    (q) => vocabulary.find((v) => v.id === q.itemId)!.german,
  );
  const result = s.finishVocabulary(session.id, answers);
  expect(vocabularyProgress(result).level).toBe(3);
  expect(vocabularyProgress(result).total).toBe(16);
  expect(() => s.finishVocabulary(session.id, answers)).toThrow();
  const backup = s.export();
  s.restore(backup);
  expect(s.vocabularyHistory()).toEqual([result]);
  const wrong = structuredClone(backup);
  wrong.vocabulary[0].answers[0].correct = false;
  expect(() => s.restore(wrong)).toThrow();
  expect(s.vocabularyHistory()).toHaveLength(1);
  s.db.close();
});
test('recall accepts omitted articles and case, but preserves German spelling', () => {
  const item = vocabulary.find((v) => v.german === 'der Schlüssel')!;
  expect(answerCorrect(item, 'recall', ' SCHLÜSSEL ')).toBe(true);
  expect(answerCorrect(item, 'recall', 'Schlussel')).toBe(false);
  expect(answerCorrect(item, 'recall', '')).toBe(false);
});
