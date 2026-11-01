import type { AudioSegment } from './types';
export interface PhonePair {
  expected: string;
  heard: string;
}

/** Align recognized phone tokens to the reference, then group by reference word.
 * Boundaries are inferred, not timestamps. Insertions at a boundary belong to
 * the preceding word (leading insertions belong to the first word).
 */
export function comparePhones(
  groups: string[][],
  heard: string[],
  spans?: AudioSegment[],
) {
  const expected = groups.flat();
  if (!expected.length) return undefined;
  const owners = groups.flatMap((group, word) => group.map(() => word));
  const costs = Array.from(
    { length: expected.length + 1 },
    () => new Uint32Array(heard.length + 1),
  );
  for (let i = 0; i <= expected.length; i++) costs[i][0] = i;
  for (let j = 0; j <= heard.length; j++) costs[0][j] = j;
  for (let i = 1; i <= expected.length; i++) {
    for (let j = 1; j <= heard.length; j++) {
      costs[i][j] = Math.min(
        costs[i - 1][j - 1] + Number(expected[i - 1] !== heard[j - 1]),
        costs[i - 1][j] + 1,
        costs[i][j - 1] + 1,
      );
    }
  }

  const alignment: (PhonePair & { word: number; heardIndex?: number })[] = [];
  let i = expected.length;
  let j = heard.length;
  while (i || j) {
    if (
      i &&
      j &&
      costs[i][j] ===
        costs[i - 1][j - 1] + Number(expected[i - 1] !== heard[j - 1])
    ) {
      alignment.push({
        word: owners[i - 1],
        expected: expected[--i],
        heardIndex: j - 1,
        heard: heard[--j],
      });
    } else if (i && costs[i][j] === costs[i - 1][j] + 1) {
      alignment.push({
        word: owners[i - 1],
        expected: expected[--i],
        heard: '',
      });
    } else {
      alignment.push({
        word: owners[Math.max(0, i - 1)],
        expected: '',
        heardIndex: j - 1,
        heard: heard[--j],
      });
    }
  }
  const wordSpans = groups.map(() => [] as AudioSegment[]);
  const validSpans =
    spans?.length === heard.length &&
    spans.every(
      (span, i) =>
        Number.isFinite(span.start) &&
        Number.isFinite(span.end) &&
        span.start >= 0 &&
        span.end > span.start &&
        (!i || span.start >= spans[i - 1].end),
    );
  const pairs = groups.map(() => [] as PhonePair[]);
  for (const { word, expected, heard, heardIndex } of alignment.reverse()) {
    pairs[word].push({ expected, heard });
    if (validSpans && heardIndex !== undefined)
      wordSpans[word].push(spans![heardIndex]);
  }
  return groups.map((group, word) => {
    const differences = pairs[word].filter(
      (pair) => pair.expected !== pair.heard,
    );
    return {
      segment: wordSpans[word].length
        ? { start: wordSpans[word][0].start, end: wordSpans[word].at(-1)!.end }
        : undefined,
      pairs: pairs[word],
      expectedPhones: group,
      heardPhones: pairs[word].flatMap((pair) =>
        pair.heard ? [pair.heard] : [],
      ),
      differences,
      severity: group.length
        ? Math.min(1, differences.length / group.length)
        : null,
    };
  });
}
