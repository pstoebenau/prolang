import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { apiMutation } from '$lib/server/http';
import { store } from '$lib/server/store';
import { worker } from '$lib/server/inference';
import { passageById } from '$lib/skills/passages';
import { readingProgress } from '$lib/skills/progression';
export const POST = apiMutation(async ({ request }) => {
  const f = await request.formData();
  const passage = passageById(z.string().parse(f.get('passageId')));
  const progress = readingProgress(store.readingHistory());
  if (passage.placement && progress.nextPlacement !== passage.id)
    error(
      409,
      'This placement sample is already complete. Refresh to continue.',
    );
  const file = f.get('file');
  if (!(file instanceof File) || file.size < 200)
    error(422, 'No audio captured. Check your microphone and record again.');
  if (file.size > 16 * 1024 * 1024)
    error(413, 'Record at most two minutes (16 MB).');
  const data = new Uint8Array(await file.arrayBuffer());
  const body = new FormData();
  body.set('file', new Blob([data], { type: file.type }), 'recording');
  body.set('text', passage.text);
  const feedback = await (await worker('/reading', body)).json();
  // Reject a second placement submission that finished after another tab.
  if (
    passage.placement &&
    readingProgress(store.readingHistory()).nextPlacement !== passage.id
  )
    error(409, 'Placement already saved. Refresh to continue.');
  return json(
    store.readingAttempt(passage.id, feedback, { data, mime: file.type }),
  );
});
