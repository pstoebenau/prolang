import { expect, test } from '@playwright/test';

test('routes render data without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:5199/deck');
    await expect(page.locator('.deck-row')).toHaveCount(100);
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page).toHaveURL(/\/progress$/);
    await expect(
      page.getByRole('heading', { name: 'Your progress' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page.locator('#backup').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Replace with backup' }).click();
    await expect(page.getByRole('status')).toContainText(
      'Existing data was preserved',
    );
  } finally {
    await context.close();
  }
});

test('practice grades invalidate server data and retry links survive reloads', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reveal answer', exact: true })
    .click();
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await expect(page.locator('.step')).toContainText('2 / 5');
  await page.getByRole('link', { name: 'Progress', exact: true }).click();
  await expect(page.locator('.stats')).toContainText(/1\s*\/\s*100/);
  await page.getByRole('link', { name: 'Deck', exact: true }).click();
  await page.getByRole('searchbox').fill('Mutter');
  await page
    .locator('.deck-row')
    .first()
    .getByRole('link', { name: 'Practice', exact: true })
    .click();
  await expect(page).toHaveURL(/\?retry=\d+$/);
  await expect(
    page.getByRole('heading', { name: 'Pronunciation practice' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Pronunciation practice' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Reveal answer', exact: true })
    .click();
  await expect(page.getByRole('link', { name: 'Finish retry' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('API rejects cross-origin writes, malformed JSON and unsupported methods', async ({
  request,
}) => {
  expect(
    (await request.post('/api/session', { data: { mode: 'review' } })).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/session', {
        headers: {
          origin: 'http://127.0.0.1:5199',
          'content-type': 'application/json',
        },
        data: '{',
      })
    ).status(),
  ).toBe(400);
  expect((await request.get('/api/session')).status()).toBe(405);
  expect((await request.get('/api/missing')).status()).toBe(404);
});

test('leaving practice releases active microphone tracks', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { testTrack?: MediaStreamTrack };
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext();
      const destination = audio.createMediaStreamDestination();
      state.testTrack = destination.stream.getAudioTracks()[0];
      return destination.stream;
    };
  });
  await page.goto('/?retry=2');
  await page
    .getByRole('button', { name: 'Record German', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Stop & check' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Deck', exact: true }).click();
  await expect(page).toHaveURL(/\/deck$/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { testTrack?: MediaStreamTrack }).testTrack
            ?.readyState,
      ),
    )
    .toBe('ended');
});

test('unflagged phoneme differences render for the selected word', async ({
  page,
  request,
}) => {
  const deck = await (await request.get('/api/deck')).json();
  const card = deck.find(
    (entry: { german: string }) => entry.german === 'die Tochter',
  );
  expect(card).toBeTruthy();
  await page.addInitScript(() => {
    const state = window as typeof window & {
      playbackStarts: number[][];
      playbackStops: number;
    };
    state.playbackStarts = [];
    state.playbackStops = 0;
    navigator.mediaDevices.getUserMedia = async () =>
      new AudioContext().createMediaStreamDestination().stream;
    AudioContext.prototype.decodeAudioData = async function () {
      return this.createBuffer(1, 32000, 16000);
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      when = 0,
      offset = 0,
      duration = 0,
    ) {
      state.playbackStarts.push([when, offset, duration]);
      start.call(this, when, offset, duration);
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function () {
      state.playbackStops++;
      stop.call(this);
    };
  });
  await page.route('**/api/assess', (route) =>
    route.fulfill({
      json: {
        id: 'mock-attempt',
        target: 'die Tochter',
        card,
        feedback: {
          transcribe: 'der tochter',
          differences: {
            expected_phones: [
              ['d', 'i'],
              ['t', 'ɔ', 'x', 't', 'ɜ'],
            ],
            heard_phones: ['d', 'e', 't', 'ɔ', 'x', 't', 'a'],
            heard_phone_spans: [
              { start: 0.1, end: 0.15 },
              { start: 0.16, end: 0.3 },
              { start: 0.4, end: 0.5 },
              { start: 0.5, end: 0.6 },
              { start: 0.6, end: 0.7 },
              { start: 0.7, end: 0.8 },
              { start: 0.8, end: 0.9 },
            ],
            errors: [],
          },
        },
      },
    }),
  );
  // Reference playback is outside this regression; serve a short silent WAV.
  const wav = Buffer.alloc(364);
  wav.write('RIFF');
  wav.writeUInt32LE(356, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(320, 40);
  await page.route('**/api/reference', (route) =>
    route.fulfill({ contentType: 'audio/wav', body: wav }),
  );
  await page.goto(`/?retry=${card.id}`);
  await page
    .getByRole('button', { name: 'Record German', exact: true })
    .click();
  await page.getByRole('button', { name: 'Stop & check' }).click();
  await expect(
    page.getByRole('button', { name: 'die: Sound differs', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.selected-word dd').first().locator('mark'),
  ).toHaveText('i');
  await expect(
    page.locator('.selected-word dd').last().locator('mark'),
  ).toHaveText('e');
  await expect(page.locator('.transcript-note')).toContainText('der tochter');
  await page
    .getByRole('button', { name: 'Tochter: Sound differs', exact: true })
    .click();
  const comparison = page.locator('.selected-word');
  await expect(comparison.locator('dd').last()).toContainText(
    /t\s*ɔ\s*x\s*t\s*a/,
  );
  await expect(comparison).not.toContainText('unavailable');
  await expect(comparison.locator('dd').first().locator('mark')).toHaveText(
    'ɜ',
  );
  await expect(comparison.locator('dd').last().locator('mark')).toHaveText('a');
  await expect(comparison.locator('mark')).toHaveCount(2);
  await expect(page.locator('.answer table')).toHaveCount(0);
  await expect(page.getByText('Details', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Listen to word', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Yours', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & { playbackStarts: number[][] }
        ).playbackStarts.map((call) =>
          call.map((value) => Number(value.toFixed(6))),
        ),
      ),
    )
    .toEqual([[0, 0.35, 0.6]]);
  await page.getByRole('button', { name: 'Native', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { playbackStops: number }).playbackStops,
      ),
    )
    .toBe(1);
  await expect(page.locator('audio[controls]')).toHaveCount(0);
  await expect(page.locator('audio:visible')).toHaveCount(0);
});
