// ASR may spell German ß as ss; sound differences are assessed separately.
export const normalizeWord = (word: string): string =>
  word.normalize('NFC').toLocaleLowerCase('de').replaceAll('ß', 'ss');
export const words = (text: string): string[] =>
  text.match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? [];
export function compareWords(expected: string, detected: string) {
  const a = words(expected),
    b = words(detected);
  const same = (x: string, y: string) => normalizeWord(x) === normalizeWord(y);
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + Number(!same(a[i - 1], b[j - 1])),
      );
  const result: { expected: string; detected: string; matches: boolean }[] = [];
  let i = a.length,
    j = b.length;
  while (i || j) {
    if (
      i &&
      j &&
      dp[i][j] === dp[i - 1][j - 1] + Number(!same(a[i - 1], b[j - 1]))
    ) {
      result.unshift({
        expected: a[--i],
        detected: b[--j],
        matches: same(a[i], b[j]),
      });
    } else if (i && dp[i][j] === dp[i - 1][j] + 1)
      result.unshift({ expected: a[--i], detected: '', matches: false });
    else result.unshift({ expected: '', detected: b[--j], matches: false });
  }
  return result;
}
