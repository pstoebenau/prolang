import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { store } from '$lib/server/store';
import { apiMutation, ticketSchema } from '$lib/server/http';
import { z } from 'zod';
import { worker } from '$lib/server/inference';
export const POST: RequestHandler = apiMutation(async ({ request }) => {
  const f = await request.formData();
  const ticket = ticketSchema.parse(f.get('ticket'));
  const t = store.getTicket(ticket);
  const c = store.all().find((c) => c.id === t.cardId)!;
  const previous = f.get('attempt');
  let data: Uint8Array;
  let mime: string;
  let target = c.german;
  if (previous) {
    const id = z.string().uuid().parse(previous);
    const rec = store.recording(id, t.cardId);
    if (!rec || !t.revealed) error(404, 'Recording unavailable. Record again.');
    data = rec.data;
    mime = rec.mime;
    target = z.string().trim().min(1).max(300).parse(f.get('target'));
  } else {
    const file = f.get('file');
    if (!(file instanceof File) || file.size < 200)
      error(422, 'No audio captured. Check your microphone and record again.');
    if (file.size > 8 * 1024 * 1024)
      error(413, 'Record at most 30 seconds (8 MB).');
    data = new Uint8Array(await file.arrayBuffer());
    mime = file.type;
  }
  const body = new FormData();
  body.set('file', new Blob([data as BlobPart], { type: mime }), 'recording');
  body.set('text', target);
  const feedback = await (await worker('/assess', body)).json();
  const id = store.attempt(ticket, target, feedback, { data, mime });
  if (previous) store.saveAlternative(c.id, target);
  return json({ id, target, feedback, card: store.reveal(ticket) });
});
