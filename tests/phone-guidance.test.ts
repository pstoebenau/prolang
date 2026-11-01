import { expect, test } from 'bun:test';
import { phoneGuidance } from '../apps/web/src/lib/phone-guidance';

test('matching phones need no correction', () => {
  expect(phoneGuidance({ expected: 'i', heard: 'i' })).toBeNull();
});
test('substitutions have concise labels and articulation cues', () => {
  const tip = phoneGuidance({ expected: 'y', heard: 'u' })!;
  expect(tip.label).toBe('y');
  expect(tip.instruction).not.toContain('/');
  expect(tip.instruction).toContain('without moving your tongue back');
});
test('length, stress and affricate notation are handled', () => {
  expect(phoneGuidance({ expected: 'ˈiː', heard: 'i' })!.instruction).toContain('longer');
  expect(phoneGuidance({ expected: 'i', heard: 'iː' })!.instruction).toContain('Shorten');
  expect(phoneGuidance({ expected: 't͡s', heard: 's' })!.instruction).toContain('no vowel');
});
test('missing, inserted and unsupported sounds have honest, actionable fallbacks', () => {
  expect(phoneGuidance({ expected: 'ç' })!.instruction).toContain('neighboring');
  expect(phoneGuidance({ expected: '', heard: 'ə' })!.instruction).toContain('Link');
  expect(phoneGuidance({ expected: 'ɬ', heard: 'l' })!.instruction).toContain('not available');
});
