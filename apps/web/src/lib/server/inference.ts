import { error } from '@sveltejs/kit';
export const inference = 'http://127.0.0.1:8001';
export async function worker(path: string, body: FormData) {
  let r: Response;
  try {
    r = await fetch(inference + path, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(path === '/reading' ? 630000 : 180000),
    });
  } catch {
    error(503, 'Speech service unavailable or timed out. Try again.');
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    error(
      r.status,
      d.detail || 'Audio processing failed. Try a shorter, clear recording.',
    );
  }
  return r;
}
