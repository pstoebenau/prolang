import { error } from '@sveltejs/kit';
import { store } from '$lib/server/store';
export const GET = ({ url }: { url: URL }) => {
  const r = store.readingRecording(url.searchParams.get('id') ?? '');
  if (!r)
    error(
      404,
      'Recording unavailable. Audio is excluded from JSON backups; record again.',
    );
  return new Response(new Uint8Array(r.data), {
    headers: { 'Content-Type': r.mime },
  });
};
