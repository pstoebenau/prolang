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
    checkParameters(b.parameters.w);
    fsrs(b.parameters as Parameters<typeof fsrs>[0]);
    this.db.transaction(() => {
      for (const table of [
        'tickets',
        'recordings',
        'attempts',
        'reviews',
        'cards',
      ])
        this.db.exec(`DELETE FROM ${table}`);
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
