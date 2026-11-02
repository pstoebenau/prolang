export type VocabularyMode = 'recognition' | 'recall';
export interface VocabularyItem {
  id: string;
  level: number;
  german: string;
  meaning: string;
  answers: string[];
}
// Original curated sample beyond the starter deck. Bands are task difficulty, not population norms.
const bands = [
  `der Schlüssel|key
 das Fenster|window
 die Straße|street
 der Regen|rain
 die Zeitung|newspaper
 der Bahnhof|train station
 die Küche|kitchen
 der Garten|garden
 schlafen|to sleep
 suchen|to search
 öffnen|to open
 bezahlen|to pay
 langsam|slow
 sauber|clean
 hungrig|hungry
 müde|tired`,
  `die Erfahrung|experience
 die Einladung|invitation
 die Entscheidung|decision
 die Umgebung|surroundings
 die Nachricht|message
 die Ausbildung|vocational training
 der Unterschied|difference
 die Gelegenheit|opportunity
 vermeiden|to avoid
 vereinbaren|to arrange
 entdecken|to discover
 empfehlen|to recommend
 zuverlässig|reliable
 notwendig|necessary
 neugierig|curious
 gemeinsam|joint`,
  `die Voraussetzung|prerequisite
 die Auswirkung|impact
 der Zusammenhang|connection
 die Verantwortung|responsibility
 der Widerspruch|contradiction
 die Einschätzung|assessment
 die Maßnahme|measure
 die Herausforderung|challenge
 berücksichtigen|to take into account
 gewährleisten|to guarantee
 hinterfragen|to question critically
 überzeugen|to convince
 nachhaltig|sustainable
 nachvollziehbar|comprehensible
 vorübergehend|temporary
 sorgfältig|careful`,
  `die Unzulänglichkeit|inadequacy
 die Verhältnismäßigkeit|proportionality
 der Handlungsspielraum|room for maneuver
 die Wechselwirkung|reciprocal effect
 die Tragweite|far-reaching significance
 das Zugeständnis|concession
 die Unvoreingenommenheit|open-mindedness
 der Ermessensspielraum|scope of discretion
 bewerkstelligen|to accomplish
 veranschaulichen|to illustrate
 beeinträchtigen|to impair
 schlussfolgern|to infer
 unerlässlich|indispensable
 widersprüchlich|contradictory
 unmissverständlich|unambiguous
 stichhaltig|well-founded`,
];
export const vocabulary: VocabularyItem[] = bands.flatMap((band, level) =>
  band.split('\n').map((line, i) => {
    const [german, meaning] = line.trim().split('|');
    return {
      id: `v-${level}-${i}`,
      level,
      german,
      meaning,
      answers: [german, german.replace(/^(der|die|das) /, '')],
    };
  }),
);
export function normalizeAnswer(value: string) {
  return value
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('de')
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ');
}
export function answerCorrect(
  item: VocabularyItem,
  mode: VocabularyMode,
  answer: string,
) {
  return mode === 'recognition'
    ? answer === item.id
    : item.answers.some((a) => normalizeAnswer(a) === normalizeAnswer(answer));
}
export interface VocabularyResult {
  id: string;
  at: string;
  mode: VocabularyMode;
  answers: { itemId: string; answer: string; correct: boolean }[];
}
export function vocabularyProgress(result?: VocabularyResult) {
  if (!result)
    return { level: 0, assessed: false, bands: [] as number[], total: 0 };
  const bands = [0, 1, 2, 3].map(
    (level) =>
      result.answers.filter(
        (a) =>
          a.correct &&
          vocabulary.find((v) => v.id === a.itemId)?.level === level,
      ).length,
  );
  let level = 0;
  // Four recognition answers limits promotion through chance; recall tolerates one miss per band.
  const threshold = result.mode === 'recognition' ? 4 : 3;
  for (let i = 0; i < 3; i++) {
    if (bands[i] < threshold) break;
    level = i + 1;
  }
  return {
    level,
    assessed: true,
    bands,
    total: result.answers.filter((a) => a.correct).length,
  };
}
