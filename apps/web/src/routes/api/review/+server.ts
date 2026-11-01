import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { store } from '$lib/server/store';
import { apiMutation, ticketSchema } from '$lib/server/http';
import { z } from 'zod';
export const POST: RequestHandler = apiMutation(async ({ request }) => {
  const b = z
    .object({
      ticket: ticketSchema,
      grade: z.number().int().min(1).max(4),
    })
    .strict()
    .parse(await request.json());
  return json(store.review(b.ticket, b.grade as 1 | 2 | 3 | 4));
});
