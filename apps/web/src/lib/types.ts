import type { Card } from 'ts-fsrs';
export type ScheduledCard = Omit<Card, 'due' | 'last_review'> & {
  due: string;
  last_review?: string;
};
export interface DeckEntry {
  id: number;
  english: string;
  german: string;
  category: string;
  plural: string;
  example: string;
  exampleEnglish: string;
  version: number;
  card: ScheduledCard;
  alternatives: string[];
}
export interface Ticket {
  ticket: string;
  id: number;
  english: string;
  category: string;
  mode: 'review' | 'retry';
}

export interface AudioSegment {
  start: number;
  end: number;
}

export interface SpeechFeedback {
  score?: number;
  transcribe?: string;
  differences?: {
    transcribe_raw?: string;
    expected_phones?: string[][];
    expected_phonemes?: string[] | string[][];
    heard_phone_spans?: AudioSegment[];
    heard_phones?: string[] | string[][];
    errors?: {
      word?: string;
      position?: number;
      phone_distance?: number;
      expected?: string | string[];
      actual?: string | string[];
      phones?: { expected: string; heard?: string }[];
    }[];
  };
}

export interface ReviewRecord {
  id: string;
  cardId: number;
  at: string;
  grade: number;
  log: unknown;
}
export interface AttemptRecord {
  id: string;
  cardId: number;
  at: string;
  target: string;
  feedback: SpeechFeedback;
}
export interface PracticeHistory {
  reviews: ReviewRecord[];
  attempts: AttemptRecord[];
}
