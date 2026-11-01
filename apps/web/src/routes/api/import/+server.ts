import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { store } from '$lib/server/store';
import { apiMutation } from '$lib/server/http';
import { z } from 'zod';
export const POST: RequestHandler = apiMutation(async ({ request }) => {
  const b = z
    .object({ confirm: z.literal('REPLACE'), backup: z.unknown() })
    .strict()
    .parse(await request.json());
  store.restore(b.backup);
  return json({ ok: true });
});
