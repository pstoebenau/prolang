import recordings from './phone-audio.json';

export function phoneAudio(phone: string) {
  // Stress and length do not change which sound-quality example to play.
  // Keep other diacritics: a different articulation needs its own recording.
  const key = phone.normalize('NFC').replace(/[ˈˌː͜͡]/gu, '').replace('g', 'ɡ');
  return recordings[key as keyof typeof recordings];
}
