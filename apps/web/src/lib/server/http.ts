import { error, isHttpError, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
export const ticketSchema = z.string().uuid();
// Preserve the origin and streaming size checks for every JSON/audio mutation.
export function apiMutation(
  handler: (event: RequestEvent) => Promise<Response>,
) {
  return async (event: RequestEvent) => {
    let { request, url } = event;
    if (request.headers.get('origin') !== url.origin)
      error(403, 'Open Prolang from its configured origin.');
    request = await limitRequestBody(request);

    try {
      return await handler({ ...event, request });
    } catch (e: unknown) {
      if (isHttpError(e)) throw e;
      error(
        e instanceof z.ZodError || e instanceof SyntaxError ? 400 : 409,
        e instanceof z.ZodError
          ? 'Invalid input or backup format. Existing data was preserved.'
          : e instanceof Error
            ? e.message
            : 'Request failed',
      );
    }
  };
}

export async function limitRequestBody(request: Request): Promise<Request> {
  if (Number(request.headers.get('content-length') || 0) > 25 * 1024 * 1024)
    error(413, 'Upload is too large.');
  const reader = request.body?.getReader();
  if (reader) {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 25 * 1024 * 1024) {
        await reader.cancel();
        error(413, 'Upload is too large.');
      }
      chunks.push(value);
    }
    request = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: new Blob(chunks as BlobPart[]),
    });
  }

  return request;
}
