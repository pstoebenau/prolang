import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { inference } from '$lib/server/inference';
export const GET: RequestHandler = async () => {
  try {
    const r = await fetch(inference + '/health', {
      signal: AbortSignal.timeout(2000),
    });
    return json(
      { status: r.ok ? 'ready' : 'starting', database: true },
      { status: r.ok ? 200 : 503 },
    );
  } catch {
    return json({ status: 'starting' }, { status: 503 });
  }
};
