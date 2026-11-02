import type { SpeechFeedback } from '../types';
import { passageById } from './passages';
export interface ReadingAttempt {
  id: string;
  passageId: string;
  at: string;
  target: string;
  level: number;
  placement: boolean;
  feedback: SpeechFeedback;
}
export function readingProgress(attempts: ReadingAttempt[]) {
  const chronological = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
  const placement = new Map<string, ReadingAttempt>();
  for (const a of chronological.filter((a) => a.placement))
    placement.set(a.passageId, a);
  const placed = placement.size >= 3;
  let level = 0;
  if (placed) {
    // Require success at every preceding difficulty, rather than one lucky score.
    for (let i = 0; i < 3; i++) {
      const sample = placement.get(`placement-${i}`);
      if (!sample || (sample.feedback.score ?? 0) < 80) break;
      level = Math.min(3, i + 1);
    }
  }
  let recent = new Map<string, number>();
  const placedAt =
    [...placement.values()]
      .map((a) => a.at)
      .sort()
      .at(-1) ?? '';
  for (const a of chronological) {
    if (!placed || a.placement || a.at <= placedAt || a.level !== level)
      continue;
    const score = a.feedback.score;
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    recent.delete(a.passageId);
    recent.set(a.passageId, score);
    if (recent.size >= 3) {
      const scores = [...recent.values()].slice(-3);
      if (scores.every((s) => s >= 80) && level < 3) {
        level++;
        recent.clear();
      } else if (scores.every((s) => s < 55) && level > 0) {
        level--;
        recent.clear();
      }
    }
  }
  return {
    placed,
    level,
    placementDone: placement.size,
    nextPlacement: ['placement-0', 'placement-1', 'placement-2'].find(
      (id) => !placement.has(id),
    ),
    successful: [...recent.values()].filter((s) => s >= 80).length,
    nextStage:
      level < 3
        ? Math.max(0, 3 - [...recent.values()].filter((s) => s >= 80).length)
        : 0,
  };
}
export function validateReadingAttempt(a: ReadingAttempt) {
  const p = passageById(a.passageId);
  if (
    a.level !== p.level ||
    a.placement !== !!p.placement ||
    a.target !== p.text
  )
    throw Error('Passage metadata does not match the built-in passage.');
}
