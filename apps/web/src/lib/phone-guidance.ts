// Articulatory terminology follows the IPA chart:
// https://www.internationalphoneticassociation.org“content”ipa-chart
// These are practice cues, not a diagnosis of the speaker's mouth position.
const cues: Record<string, string> = {
  i: 'Raise the front of your tongue close to the roof of your mouth. Keep your lips unrounded and the vowel steady.',
  ɪ: 'Keep the tongue near the front but slightly lower and more relaxed than “i”. Keep this vowel short.',
  e: 'Keep the front of your tongue medium-high and your lips unrounded. Hold one steady vowel without an English-style glide.',
  ɛ: 'Lower the front of your tongue and open your jaw more than for “e”. Keep your lips unrounded.',
  a: 'Open your jaw and keep your tongue low, with unrounded lips.',
  ɑ: 'Open your jaw and keep the tongue low toward the back, with unrounded lips.',
  o: 'Round your lips and raise the back of your tongue to a medium-high position. Avoid gliding into “u”.',
  ɔ: 'Round your lips, but open your jaw and lower your tongue more than for “o”.',
  u: 'Round your lips and raise the back of your tongue close to the roof of your mouth.',
  ʊ: 'Use a short, relaxed vowel with rounded lips; lower your tongue slightly from “u”.',
  y: 'Start with the tongue position for “i”, then round your lips without moving your tongue back.',
  ʏ: 'Start with the relaxed tongue position for “ɪ”, then round your lips. Keep the vowel short.',
  ø: 'Start with the tongue position for “e”, then round your lips while keeping your tongue forward.',
  œ: 'Start with the open tongue position for “ɛ”, then round your lips without moving your tongue back.',
  ə: 'Relax your jaw and tongue in the middle of your mouth. Use a light, unstressed vowel.',
  ɐ: 'Keep the tongue central and low, with relaxed lips. Use a light vowel rather than a strong consonant r.',
  ɜ: 'Keep the tongue central, open the jaw moderately, and leave your lips unrounded.',
  ç: 'Raise the middle of your tongue toward the hard palate, as for “j”, but let air hiss through without voice. Do not close the gap or round your lips for “ʃ”.',
  x: 'Raise the back of your tongue toward the soft palate and let air flow through a narrow gap. Keep the airflow continuous rather than closing it for “k”.',
  ʃ: 'Bring the tongue blade just behind the gum ridge and gently round your lips. Let air hiss through without voice.',
  ʒ: 'Use the tongue position for “ʃ” and add a gentle buzz in your throat.',
  s: 'Keep the tongue close to the ridge behind your upper teeth and let air hiss through a narrow central gap, without voice.',
  z: 'Use the tongue position for “s” and add a gentle buzz in your throat.',
  f: 'Touch your upper teeth lightly to your lower lip and blow air through without voice.',
  v: 'Touch your upper teeth lightly to your lower lip and add a gentle throat buzz as air passes.',
  h: 'Let air flow freely from the throat into the following vowel, without narrowing the tongue into a hiss.',
  j: 'Raise the front of your tongue toward the hard palate and glide straight into the next vowel, without friction.',
  l: 'Touch the tongue tip to the ridge behind your upper teeth and let voiced air pass around its sides.',
  m: 'Close your lips and hum, allowing air out through your nose.',
  n: 'Touch your tongue tip to the ridge behind your upper teeth and hum through your nose.',
  ŋ: 'Touch the back of your tongue to the soft palate and hum through your nose. Avoid adding a separate “g” release.',
  p: 'Close both lips, briefly stop the air, then release without a throat buzz.',
  b: 'Close both lips, briefly stop the air, then release with voice.',
  t: 'Touch the tongue tip to the ridge behind your upper teeth, stop the air briefly, then release without voice.',
  d: 'Touch the tongue tip to the ridge behind your upper teeth, stop the air briefly, then release with voice.',
  k: 'Raise the back of your tongue to the soft palate, stop the air briefly, then release without voice.',
  ɡ: 'Raise the back of your tongue to the soft palate, stop the air briefly, then release with voice.',
  ʁ: 'Narrow the space between the back of your tongue and the uvula. Add gentle voiced friction without forcing a growl. German r varies by region.',
  r: 'Place the tongue tip near the gum ridge and let airflow vibrate it; avoid tensing it. German r varies by region.',
  ʔ: 'Briefly close and release the airflow at your vocal folds before the vowel; do not add a “k”.',
  aɪ: 'Start with an open “a” and glide toward “ɪ” within one syllable.',
  aʊ: 'Start with an open “a” and glide toward rounded “ʊ” within one syllable.',
  ɔʏ: 'Start with rounded “ɔ” and glide toward the front rounded vowel “ʏ” within one syllable.',
  ts: 'Release “t” directly into “s”, with no vowel between them.',
  pf: 'Release the lip closure of “p” directly into “f”, with no vowel between them.',
  tʃ: 'Release “t” directly into “ʃ”, with no vowel between them.',
};
cues.g = cues.ɡ;

function normalize(phone: string) {
  return phone.normalize('NFC').replace(/[ˈˌ͜͡]/gu, '');
}

export function phoneGuidance(pair: { expected: string; heard?: string }) {
  const expected = pair.expected;
  const heard = pair.heard ?? '';
  if (expected === heard) return null;
  const target = normalize(expected);
  const actual = normalize(heard);
  const base = target.replace(/ː/g, '');
  const cue = cues[base];
  const label = !expected ? `Extra sound: ${heard}` : !heard ? `Add ${expected}` : expected;
  let instruction: string;
  if (!expected) {
    instruction = 'Link the sounds on either side directly, without adding another sound or syllable. Compare Native and Yours to check the transition.';
  } else if (target !== actual && base === actual.replace(/ː/g, '') && heard) {
    instruction = target.includes('ː')
      ? 'Hold this vowel longer while keeping its tongue and lip position steady. Match the duration in Native.'
      : 'Shorten this vowel without adding a glide. Match the duration in Native.';
  } else {
    instruction = cue ?? 'Listen to this part of Native, imitate it slowly, then blend it back into the word. A specific articulation cue is not available for this symbol.';
    if (cue && target.includes('ː')) instruction += ' Hold this vowel longer, keeping its quality steady.';
    if (!heard) instruction += ' Practice it between the neighboring sounds, then say the whole word.';
  }
  return { expected, heard, label, instruction };
}
