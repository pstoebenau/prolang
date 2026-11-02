import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { store } from '$lib/server/store';
import { apiMutation } from '$lib/server/http';
export const POST = apiMutation(async ({ request }) => {
  const b = z
    .discriminatedUnion('action', [
      z
        .object({
          action: z.literal('start'),
          mode: z.enum(['recognition', 'recall']),
        })
        .strict(),
      z
        .object({
          action: z.literal('finish'),
          id: z.string().uuid(),
          answers: z.array(z.string().max(200)).length(16),
        })
        .strict(),
    ])
    .parse(await request.json());
  if (b.action === 'start') return json(store.startVocabulary(b.mode));
  const result = store.finishVocabulary(b.id, b.answers);
  return json(result);
});
