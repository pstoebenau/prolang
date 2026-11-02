import { readingSchema, vocabularyResultSchema } from './skill-data';
import { passageById } from '../skills/passages';
import {
  validateReadingAttempt,
  type ReadingAttempt,
} from '../skills/progression';
import {
  vocabulary,
  answerCorrect,
  type VocabularyResult,
  type VocabularyMode,
} from '../skills/vocabulary';
import type {
  DeckEntry,
  SpeechFeedback,
  PracticeHistory,
  ReviewRecord,
  AttemptRecord,
} from '$lib/types';
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  checkParameters,
  type Card,
  type Grade,
} from 'ts-fsrs';
import { z } from 'zod';
import deck from '../../../../../packages/deck/cards.json';
export const params = generatorParameters({ enable_fuzz: false });
const date = z.iso.datetime();
const cardSchema = z
  .object({
    due: date,
    stability: z.number().nonnegative(),
    difficulty: z.number().nonnegative(),
    elapsed_days: z.number().nonnegative(),
    scheduled_days: z.number().nonnegative(),
    learning_steps: z.number().int().nonnegative(),
    reps: z.number().int().nonnegative(),
    lapses: z.number().int().nonnegative(),
    state: z.number().int().min(0).max(3),
    last_review: date.optional(),
  })
  .strict();
const reviewLogSchema = z
  .object({
    rating: z.number().int().min(1).max(4),
    state: z.number().int().min(0).max(3),
    due: date,
    stability: z.number().nonnegative(),
    difficulty: z.number().nonnegative(),
    elapsed_days: z.number().nonnegative(),
    last_elapsed_days: z.number().nonnegative(),
    scheduled_days: z.number().nonnegative(),
    learning_steps: z.number().int().nonnegative(),
    review: date,
  })
  .strict();
const feedbackSchema = z.record(z.string(), z.json());
const backupSchema = z
  .object({
    version: z.literal(1),
    reading: z.array(readingSchema).max(100000).optional(),
    vocabulary: z.array(vocabularyResultSchema).max(100000).optional(),
    exportedAt: date,
    audioPolicy: z.literal('excluded'),
    parameters: z
      .object({
        request_retention: z.number().min(0.7).max(0.99),
        maximum_interval: z.number().int().min(1).max(36500),
        w: z.array(z.number().min(-100).max(100)).min(17).max(21),
        enable_fuzz: z.boolean(),
        enable_short_term: z.boolean(),
        learning_steps: z.array(z.string().regex(/^\d+(?:m|h|d)$/)).max(20),
        relearning_steps: z.array(z.string().regex(/^\d+(?:m|h|d)$/)).max(20),
      })
      .strict(),
    cards: z
      .array(
        z
          .object({
            id: z.number().int().min(1).max(100),
            version: z.number().int().nonnegative(),
            card: cardSchema,
            alternatives: z.array(z.string().trim().min(1).max(300)).max(50),
          })
          .strict(),
      )
      .length(100),
    reviews: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            cardId: z.number().int().min(1).max(100),
            at: date,
            grade: z.number().int().min(1).max(4),
            log: reviewLogSchema,
          })
          .strict(),
      )
      .max(100000),
    attempts: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            cardId: z.number().int().min(1).max(100),
            at: date,
            target: z.string().min(1).max(300),
            feedback: feedbackSchema,
          })
          .strict(),
      )
      .max(100000),
  })
  .strict();
export class Store {
  db: Database;
  constructor(
    path = process.env.DATABASE_PATH ||
      resolve(import.meta.dir, '../../../../../data/prolang.sqlite'),
  ) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;',
    );
    this.migrate();
  }
  migrate() {
    this.db.transaction(() => {
      this.db.exec(
        `CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY); CREATE TABLE IF NOT EXISTS cards(id INTEGER PRIMARY KEY,version INTEGER NOT NULL DEFAULT 0,card TEXT NOT NULL,alternatives TEXT NOT NULL DEFAULT '[]'); CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,cardId INTEGER NOT NULL,at TEXT NOT NULL,grade INTEGER NOT NULL,log TEXT NOT NULL); CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,cardId INTEGER NOT NULL,at TEXT NOT NULL,target TEXT NOT NULL,feedback TEXT NOT NULL); CREATE TABLE IF NOT EXISTS recordings(id TEXT PRIMARY KEY,data BLOB NOT NULL,mime TEXT NOT NULL); CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,cardId INTEGER NOT NULL,version INTEGER NOT NULL,mode TEXT NOT NULL,revealed INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL); INSERT OR IGNORE INTO migrations VALUES(1);`,
      );
      this.db
        .exec(`CREATE TABLE IF NOT EXISTS reading_attempts(id TEXT PRIMARY KEY, at TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS vocabulary_results(id TEXT PRIMARY KEY, at TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS vocabulary_sessions(id TEXT PRIMARY KEY, created INTEGER NOT NULL, payload TEXT NOT NULL);`);
      for (const c of deck)
        this.db
          .query('INSERT OR IGNORE INTO cards(id,card) VALUES(?,?)')
          .run(c.id, JSON.stringify(createEmptyCard()));
      this.db
        .query("INSERT OR IGNORE INTO settings VALUES('parameters',?)")
        .run(JSON.stringify(params));
    })();
  }
  all(): DeckEntry[] {
    return (
      this.db.query('SELECT * FROM cards ORDER BY id').all() as {
        id: number;
        version: number;
        card: string;
        alternatives: string;
      }[]
    ).map((c) => ({
      ...deck[c.id - 1],
      version: c.version,
      card: JSON.parse(c.card),
      alternatives: JSON.parse(c.alternatives),
    }));
  }
  issue(cardId: number, mode: 'review' | 'retry') {
    this.db
      .query('DELETE FROM tickets WHERE created < ?')
      .run(Date.now() - 86400000);
    const c = this.all().find((c) => c.id === cardId);
    if (!c) throw Error('Unknown card');
    const id = crypto.randomUUID();
    this.db
      .query(
        'INSERT INTO tickets(id,cardId,version,mode,created) VALUES(?,?,?,?,?)',
      )
      .run(id, cardId, c.version, mode, Date.now());
    return {
      ticket: id,
      id: cardId,
      english: c.english,
      category: c.category,
      mode,
    };
  }
  getTicket(id: string) {
    const t = this.db
      .query('SELECT * FROM tickets WHERE id=? AND created>?')
      .get(id, Date.now() - 86400000) as {
      cardId: number;
      version: number;
      mode: 'review' | 'retry';
      revealed: number;
      used: number;
    } | null;
    if (!t || t.used)
      throw Error('This practice has expired. Start another card.');
    return t;
  }
  reveal(id: string) {
    const t = this.getTicket(id);
    this.db.query('UPDATE tickets SET revealed=1 WHERE id=?').run(id);
    return this.all().find((c) => c.id === t.cardId)!;
  }
  attempt(
    ticket: string,
    target: string,
    feedback: SpeechFeedback,
    recording?: { data: Uint8Array; mime: string },
  ) {
    const t = this.getTicket(ticket);
    const id = crypto.randomUUID();
    this.db.transaction(() => {
      this.db
        .query('INSERT INTO attempts VALUES(?,?,?,?,?)')
        .run(
          id,
          t.cardId,
          new Date().toISOString(),
          target,
          JSON.stringify(feedback),
        );
      if (recording)
        this.db
          .query('INSERT INTO recordings VALUES(?,?,?)')
          .run(id, recording.data, recording.mime);
      this.reveal(ticket);
    })();
    return id;
  }
  review(ticket: string, grade: Grade) {
    return this.db.transaction(() => {
      const t = this.getTicket(ticket);
      if (t.mode !== 'review' || !t.revealed)
        throw Error('Reveal a vocabulary review before grading.');
      const c = this.all().find((c) => c.id === t.cardId)!;
      if (c.version !== t.version)
        throw Error('This card was already reviewed. Start another card.');
      const now = new Date();
      const input = {
        ...c.card,
        due: new Date(c.card.due),
        last_review: c.card.last_review
          ? new Date(c.card.last_review)
          : undefined,
      } as Card;
      const scheduler = fsrs(
        JSON.parse(
          (
            this.db
              .query("SELECT value FROM settings WHERE key='parameters'")
              .get() as { value: string }
          ).value,
        ),
      );
      const result = scheduler.next(input, now, grade);
      this.db
        .query('UPDATE cards SET card=?,version=version+1 WHERE id=?')
        .run(JSON.stringify(result.card), c.id);
      this.db
        .query('INSERT INTO reviews VALUES(?,?,?,?,?)')
        .run(
          crypto.randomUUID(),
          c.id,
          now.toISOString(),
          grade,
          JSON.stringify(result.log),
        );
      this.db.query('UPDATE tickets SET used=1 WHERE id=?').run(ticket);
      return result.card;
    })();
  }
  recording(id: string, cardId: number) {
    return this.db
      .query(
        `SELECT recordings.data, recordings.mime FROM recordings
      JOIN attempts ON attempts.id = recordings.id WHERE attempts.id = ? AND attempts.cardId = ?`,
      )
      .get(id, cardId) as { data: Uint8Array; mime: string } | null;
  }
  saveAlternative(cardId: number, target: string) {
    const card = this.all().find((card) => card.id === cardId);
    if (!card) throw Error('Unknown card');
    const alternatives = [...new Set([...card.alternatives, target])].slice(
      -50,
    );
    this.db
      .query('UPDATE cards SET alternatives=? WHERE id=?')
      .run(JSON.stringify(alternatives), cardId);
  }
  history(): PracticeHistory {
    return {
      reviews: (
        this.db.query('SELECT * FROM reviews ORDER BY at DESC').all() as (Omit<
          ReviewRecord,
          'log'
        > & { log: string })[]
      ).map((r) => ({ ...r, log: JSON.parse(r.log) })),
      attempts: (
        this.db.query('SELECT * FROM attempts ORDER BY at DESC').all() as (Omit<
          AttemptRecord,
          'feedback'
        > & { feedback: string })[]
      ).map((a) => ({ ...a, feedback: JSON.parse(a.feedback) })),
    };
  }
  readingHistory(): ReadingAttempt[] {
    return (
      this.db
        .query(
          'SELECT payload FROM reading_attempts ORDER BY at DESC, rowid DESC',
        )
        .all() as { payload: string }[]
    ).map((r) => JSON.parse(r.payload));
  }
  readingAttempt(
    passageId: string,
    feedback: SpeechFeedback,
    recording: { data: Uint8Array; mime: string },
  ) {
    const p = passageById(passageId);
    const a = readingSchema.parse({
      id: crypto.randomUUID(),
      passageId,
      at: new Date().toISOString(),
      target: p.text,
      level: p.level,
      placement: !!p.placement,
      feedback,
    });
    this.db.transaction(() => {
      this.db
        .query('INSERT INTO reading_attempts VALUES(?,?,?)')
        .run(a.id, a.at, JSON.stringify(a));
      this.db
        .query('INSERT INTO recordings VALUES(?,?,?)')
        .run(a.id, recording.data, recording.mime);
    })();
    return a;
  }
  readingRecording(id: string) {
    return this.db
      .query(
        'SELECT data,mime FROM recordings JOIN reading_attempts USING(id) WHERE id=?',
      )
      .get(id) as { data: Uint8Array; mime: string } | null;
  }
  vocabularyHistory(): VocabularyResult[] {
    return (
      this.db
        .query(
          'SELECT payload FROM vocabulary_results ORDER BY at DESC, rowid DESC',
        )
        .all() as { payload: string }[]
    ).map((r) => JSON.parse(r.payload));
  }
  startVocabulary(mode: VocabularyMode) {
    const shuffle = <T>(items: T[]) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    };
    const items = [0, 1, 2, 3].flatMap((level) =>
      shuffle(vocabulary.filter((v) => v.level === level)).slice(0, 4),
    );
    const questions = items.map((item) => ({
      itemId: item.id,
      prompt: mode === 'recognition' ? item.german : item.meaning,
      options:
        mode === 'recognition'
          ? shuffle([
              item,
              ...shuffle(
                vocabulary.filter(
                  (v) => v.level === item.level && v.id !== item.id,
                ),
              ).slice(0, 3),
            ]).map((v) => ({ id: v.id, label: v.meaning }))
          : [],
    }));
    const session = { id: crypto.randomUUID(), mode, questions };
    this.db
      .query('DELETE FROM vocabulary_sessions WHERE created < ?')
      .run(Date.now() - 86400000);
    this.db
      .query('INSERT INTO vocabulary_sessions VALUES(?,?,?)')
      .run(session.id, Date.now(), JSON.stringify(session));
    return session;
  }
  finishVocabulary(id: string, answers: string[]) {
    return this.db.transaction(() => {
      const row = this.db
        .query(
          'SELECT payload FROM vocabulary_sessions WHERE id=? AND created>?',
        )
        .get(id, Date.now() - 86400000) as { payload: string } | null;
      if (!row)
        throw Error(
          'Assessment expired or already submitted. Start another assessment.',
        );
      const session = JSON.parse(row.payload) as ReturnType<
        Store['startVocabulary']
      >;
      if (answers.length !== session.questions.length)
        throw Error('Answer every question, or select “I do not know”.');
      const result: VocabularyResult = {
        id,
        at: new Date().toISOString(),
        mode: session.mode,
        answers: session.questions.map((q, i) => {
          if (
            session.mode === 'recognition' &&
            answers[i] &&
            !q.options.some((o) => o.id === answers[i])
          )
            throw Error('Invalid choice.');
          return {
            itemId: q.itemId,
            answer: answers[i],
            correct: answerCorrect(
              vocabulary.find((v) => v.id === q.itemId)!,
              session.mode,
              answers[i],
            ),
          };
        }),
      };
      this.db
        .query('INSERT INTO vocabulary_results VALUES(?,?,?)')
        .run(id, result.at, JSON.stringify(result));
      this.db.query('DELETE FROM vocabulary_sessions WHERE id=?').run(id);
      return result;
    })();
  }
  export() {
    const h = this.history();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      audioPolicy: 'excluded',
      parameters: JSON.parse(
        (
          this.db
            .query("SELECT value FROM settings WHERE key='parameters'")
            .get() as { value: string }
        ).value,
      ),
      cards: this.all().map(({ id, version, card, alternatives }) => ({
        id,
        version,
        card,
        alternatives,
      })),
      ...h,
      reading: this.readingHistory(),
      vocabulary: this.vocabularyHistory(),
    };
  }
  restore(raw: unknown) {
    const b = backupSchema.parse(raw);
    if (
      new Set(b.cards.map((c) => c.id)).size !== 100 ||
      new Set(b.reviews.map((r) => r.id)).size !== b.reviews.length ||
      new Set(b.attempts.map((a) => a.id)).size !== b.attempts.length
    )
      throw Error('Duplicate identifiers');
    const reading = b.reading ?? [],
      vocab = b.vocabulary ?? [];
    for (const a of reading) validateReadingAttempt(a as ReadingAttempt);
    for (const r of vocab) {
      if (new Set(r.answers.map((a) => a.itemId)).size !== 16)
        throw Error('Duplicate vocabulary questions');
      for (const a of r.answers) {
        const item = vocabulary.find((v) => v.id === a.itemId);
        if (!item || answerCorrect(item, r.mode, a.answer) !== a.correct)
          throw Error('Invalid vocabulary result');
      }
      for (let level = 0; level < 4; level++)
        if (
          r.answers.filter(
            (a) => vocabulary.find((v) => v.id === a.itemId)!.level === level,
          ).length !== 4
        )
          throw Error('Invalid vocabulary sample');
    }
    if (
      new Set(reading.map((a) => a.id)).size !== reading.length ||
      new Set(vocab.map((a) => a.id)).size !== vocab.length
    )
      throw Error('Duplicate skill identifiers');
    checkParameters(b.parameters.w);
    fsrs(b.parameters as Parameters<typeof fsrs>[0]);
    this.db.transaction(() => {
      for (const table of [
        'reading_attempts',
        'vocabulary_results',
        'vocabulary_sessions',
        'tickets',
        'recordings',
        'attempts',
        'reviews',
        'cards',
      ])
        this.db.exec(`DELETE FROM ${table}`);
      for (const a of reading)
        this.db
          .query('INSERT INTO reading_attempts VALUES(?,?,?)')
          .run(a.id, a.at, JSON.stringify(a));
      for (const r of vocab)
        this.db
          .query('INSERT INTO vocabulary_results VALUES(?,?,?)')
          .run(r.id, r.at, JSON.stringify(r));
      for (const c of b.cards)
        this.db
          .query('INSERT INTO cards VALUES(?,?,?,?)')
          .run(
            c.id,
            c.version,
            JSON.stringify(c.card),
            JSON.stringify(c.alternatives),
          );
      for (const r of b.reviews)
        this.db
          .query('INSERT INTO reviews VALUES(?,?,?,?,?)')
          .run(r.id, r.cardId, r.at, r.grade, JSON.stringify(r.log));
      for (const a of b.attempts)
        this.db
          .query('INSERT INTO attempts VALUES(?,?,?,?,?)')
          .run(a.id, a.cardId, a.at, a.target, JSON.stringify(a.feedback));
      this.db
        .query("UPDATE settings SET value=? WHERE key='parameters'")
        .run(JSON.stringify(b.parameters));
    })();
  }
}
export const store = new Store();
