// Optional on-demand cache preparation. No reviews or recordings are created.
const origin = process.env.ORIGIN || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw Error('Use a local origin for cache preparation.');
async function post(path: string, body: unknown) {
  const response = await fetch(`${origin}/api/${path}`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) throw Error(`${path}: ${await response.text()}`);
  return response;
}
for (let id = 1; id <= 100; id++) {
  const [entry] = (await (
    await post('session', { mode: 'retry', id })
  ).json()) as { ticket: string }[];
  await post('reveal', { ticket: entry.ticket });
  await (await post('reference', { ticket: entry.ticket })).arrayBuffer();
  console.log(`Reference cached: ${id}/100`);
}
