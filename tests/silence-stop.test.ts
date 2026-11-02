import { expect, test } from 'bun:test';
import { createSilenceDetector } from '../apps/web/src/lib/practice/silence-stop';

function take() {
  const detect = createSilenceDetector();
  let now = 0;
  detect(0, now);
  return {
    advance(rms: number, ms: number) {
      let stopped = false;
      for (let i = 0; i < ms; i += 50) stopped ||= detect(rms, (now += 50));
      return stopped;
    },
    gap(ms: number) {
      return detect(0, (now += ms));
    },
  };
}
test('initial silence, background noise, and a brief click do not stop recording', () => {
  const t = take();
  expect(t.advance(0, 5000)).toBe(false);
  expect(t.advance(0.005, 2000)).toBe(false);
  expect(t.advance(0.2, 50)).toBe(false);
  expect(t.advance(0, 3000)).toBe(false);
});
test('stops after sustained sound followed by 1.5 seconds of silence', () => {
  const t = take();
  expect(t.advance(0.1, 500)).toBe(false);
  expect(t.advance(0, 1450)).toBe(false);
  expect(t.advance(0, 50)).toBe(true);
});
test('continued speech and short pauses reset the silence window', () => {
  const t = take();
  expect(t.advance(0.1, 1000)).toBe(false);
  expect(t.advance(0, 1000)).toBe(false);
  expect(t.advance(0.1, 300)).toBe(false);
  expect(t.advance(0, 1450)).toBe(false);
  expect(t.advance(0, 50)).toBe(true);
});
test('a delayed timer does not count unobserved time as silence', () => {
  const t = take();
  t.advance(0.1, 500);
  expect(t.gap(5000)).toBe(false);
  expect(t.advance(0, 1450)).toBe(false);
  expect(t.advance(0, 50)).toBe(true);
});
