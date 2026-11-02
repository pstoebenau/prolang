import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { apiMutation } from '$lib/server/http';
import { worker } from '$lib/server/inference';
import { passageById } from '$lib/skills/passages';
import { words, normalizeWord } from '$lib/word-comparison';
export const POST = apiMutation(async ({ request }) => {
  const b = z
    .object({
      passageId: z.string(),
      word: z.string().min(1).max(100).optional(),
    })
    .strict()
    .parse(await request.json());
  const p = passageById(b.passageId);
  if (
    b.word &&
    (words(b.word).length !== 1 ||
      !words(p.text).some((w) => normalizeWord(w) === normalizeWord(b.word!)))
  )
    error(400, 'Choose a word from this passage.');
  const f = new FormData();
  f.set('text', b.word ?? p.text);
  const r = await worker('/reading-reference', f);
  return new Response(r.body, { headers: { 'Content-Type': 'audio/wav' } });
});
