import { test, expect } from 'bun:test';
import { Store } from '../apps/web/src/lib/server/store';
function fresh() {
  return new Store(':memory:');
}
test('migration is idempotent and seeds exactly 100 cards', () => {
  const s = fresh();
  s.migrate();
  expect(s.all()).toHaveLength(100);
  expect(s.db.query('SELECT * FROM migrations').all()).toHaveLength(1);
  s.db.close();
});
test('retry attempts cannot schedule vocabulary; reveal required', () => {
  const s = fresh();
  const t = s.issue(1, 'retry');
  s.reveal(t.ticket);
  s.attempt(t.ticket, 'die Mutter', { score: 100 });
  expect(() => s.review(t.ticket, 3)).toThrow();
  expect(s.all()[0].card.reps).toBe(0);
  const r = s.issue(1, 'review');
  expect(() => s.review(r.ticket, 3)).toThrow();
  s.db.close();
});
test('reviews are atomic, stale and double reviews rejected, score irrelevant', () => {
  const s = fresh();
  const a = s.issue(1, 'review'),
    b = s.issue(1, 'review');
  s.attempt(a.ticket, 'die Mutter', { score: 0 });
  s.reveal(b.ticket);
  s.review(a.ticket, 4);
  expect(() => s.review(a.ticket, 1)).toThrow();
  expect(() => s.review(b.ticket, 1)).toThrow();
  expect(s.history().reviews).toHaveLength(1);
  expect(s.all()[0].card.reps).toBe(1);
  expect(s.all()[0].card.state).toBe(2);
  s.db.close();
});
test('backup restores dates, parameters, history, attempts and alternatives', () => {
  const s = fresh(),
    t = s.issue(9, 'review');
  s.attempt(t.ticket, 'die Tochter', { score: 42, transcribe: 'Tochter' });
  s.review(t.ticket, 1);
  s.db
    .query('UPDATE cards SET alternatives=? WHERE id=9')
    .run('["meine Tochter"]');
  const backup = s.export(),
    r = fresh();
  r.restore(backup);
  const actual = r.export();
  expect(actual.cards).toEqual(backup.cards);
  expect(actual.parameters).toEqual(backup.parameters);
  expect(actual.reviews).toEqual(backup.reviews);
  expect(actual.attempts).toEqual(backup.attempts);
  expect(r.db.query('SELECT * FROM recordings').all()).toHaveLength(0);
  s.db.close();
  r.db.close();
});
test('malformed imports preserve database and live practice tickets', () => {
  const s = fresh(),
    t = s.issue(1, 'review');
  const before = s.export();
  for (const bad of [
    { ...before, version: 2 },
    { ...before, cards: before.cards.slice(1) },
    { ...before, cards: before.cards.map((c) => ({ ...c, id: 1 })) },
    {
      ...before,
      cards: before.cards.map((c) => ({
        ...c,
        card: { ...c.card, due: 'tomorrow' },
      })),
    },
  ]) {
    expect(() => s.restore(bad)).toThrow();
    expect(s.export().cards).toEqual(before.cards);
    expect(s.getTicket(t.ticket).cardId).toBe(1);
  }
  s.db.close();
});

test('Again returns shortly and invalid scheduler parameters cannot replace data', () => {
  const s = fresh(),
    t = s.issue(1, 'review');
  s.reveal(t.ticket);
  const next = s.review(t.ticket, 1);
  expect(next.due.getTime() - Date.now()).toBeGreaterThan(50000);
  expect(next.due.getTime() - Date.now()).toBeLessThan(70000);
  const before = s.export();
  for (const parameters of [
    { ...before.parameters, w: [] },
    { ...before.parameters, request_retention: 2 },
  ]) {
    expect(() => s.restore({ ...before, parameters })).toThrow();
    expect(s.export().reviews).toEqual(before.reviews);
  }
  const invalid = structuredClone(before);
  invalid.reviews[0].log = {};
  expect(() => s.restore(invalid)).toThrow();
  expect(s.export().cards).toEqual(before.cards);
  s.db.close();
});
