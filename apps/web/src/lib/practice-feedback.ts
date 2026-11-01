import type { SpeechFeedback } from './types';
import { compareWords, words, normalizeWord } from './word-comparison';
import { comparePhones } from './phone-comparison';

export function practiceWords(target: string, feedback: SpeechFeedback | null) {
  let index = 0;
  const groups = feedback?.differences?.expected_phones;
  const heard = feedback?.differences?.heard_phones?.flat();
  // Do not assign reference groups to words when their tokenization disagrees.
  const aligned =
    groups?.length === words(target).length && heard
      ? comparePhones(groups, heard, feedback?.differences?.heard_phone_spans)
      : undefined;
  return compareWords(target, feedback?.transcribe ?? '').map((row) => {
    const expectedPhones = row.expected ? groups?.[index] : undefined;
    const comparison = row.expected ? aligned?.[index] : undefined;
    const error = row.expected
      ? feedback?.differences?.errors?.find(
          (e) =>
            e.position === index &&
            normalizeWord(words(e.word ?? '')[0] ?? '') ===
              normalizeWord(row.expected),
        )
      : undefined;
    if (row.expected) index++;
    const phoneSeverity =
      comparison?.severity ??
      (error &&
      typeof error.phone_distance === 'number' &&
      expectedPhones?.length
        ? Math.min(1, Math.max(0, error.phone_distance / expectedPhones.length))
        : null);
    return {
      ...row,
      expectedPhones,
      heardPhones: comparison?.heardPhones ?? error?.actual,
      segment: comparison?.segment,
      phonePairs: comparison?.pairs,
      phoneDifferences: comparison?.differences ?? error?.phones ?? [],
      // Transcription and phone recognition are separate estimates. A text
      // mismatch must not replace acoustic evidence with a maximum penalty.
      severity: phoneSeverity,
      label:
        phoneSeverity === 0
          ? 'Recognized phones match'
          : phoneSeverity !== null || error
            ? 'Sound differs'
            : !row.matches
              ? row.expected
                ? 'Transcript differs'
                : 'Extra transcript word'
              : 'Not assessed',
    };
  });
}
