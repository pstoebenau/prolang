import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { store } from '$lib/server/store';
import { apiMutation } from '$lib/server/http';
import { z } from 'zod';
export const POST: RequestHandler = apiMutation(async ({ request }) => {
  const b = z
    .object({
      mode: z.enum(['review', 'retry']),
      id: z.number().int().min(1).max(100).optional(),
    })
    .strict()
    .parse(await request.json());
  const all = store.all();
  const cards =
    b.mode === 'retry'
      ? all.filter((c) => !b.id || c.id === b.id)
      : [
          ...all
            .filter(
              (c) => c.card.reps > 0 && new Date(c.card.due) <= new Date(),
            )
            .sort((a, b) => a.card.due.localeCompare(b.card.due))
            .slice(0, 20),
          ...all.filter((c) => c.card.reps === 0).slice(0, 5),
        ];
  return json(
    cards
      .slice(0, b.mode === 'retry' ? 1 : 25)
      .map((c) => store.issue(c.id, b.mode)),
  );
});
