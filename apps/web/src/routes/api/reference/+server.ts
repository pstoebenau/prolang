import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { store } from '$lib/server/store';
import { apiMutation, ticketSchema } from '$lib/server/http';
import { z } from 'zod';
import { worker } from '$lib/server/inference';
import { words } from '$lib/word-comparison';
export const POST: RequestHandler = apiMutation(async ({ request }) => {
  const b = z
    .object({
      ticket: ticketSchema,
      word: z.string().min(1).max(100).optional(),
    })
    .strict()
    .parse(await request.json());
  const t = store.getTicket(b.ticket);
  if (!t.revealed) error(409, 'Reveal the answer first.');
  const c = store.all().find((c) => c.id === t.cardId)!;
  const f = new FormData();
  if (b.word && words(b.word).length !== 1) error(400, 'Choose a single word.');
  f.set('text', b.word ?? c.german);
  const r = await worker('/reference', f);
  return new Response(r.body, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'private, max-age=86400',
    },
  });
});
