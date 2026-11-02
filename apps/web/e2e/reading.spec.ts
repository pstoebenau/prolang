import { expect, test } from '@playwright/test';
import { passages } from '../src/lib/skills/passages';

test('paragraph recording allows pauses, scores after finish, and cancels cleanly', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext();
      const output = audio.createMediaStreamDestination();
      (window as any).readingTrack = output.stream.getAudioTracks()[0];
      return output.stream;
    };
  });
  let submissions = 0;
  const passage = passages[0];
  await page.route('**/api/reading', (route) => {
    submissions++;
    return route.fulfill({
      json: {
        id: crypto.randomUUID(),
        passageId: passage.id,
        target: passage.text,
        at: new Date().toISOString(),
        level: 0,
        placement: true,
        feedback: { score: 82, transcribe: passage.text },
      },
    });
  });
  await page.goto('/reading');
  await expect(
    page.getByRole('heading', { name: 'Find your starting stage' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Start recording', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Pauses are fine');
  expect(submissions).toBe(0);
  await page.getByRole('button', { name: 'Finish & score' }).click();
  await expect(
    page.getByRole('region', { name: 'Paragraph feedback' }),
  ).toContainText('82');
  expect(submissions).toBe(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).readingTrack.readyState))
    .toBe('ended');
  await page
    .getByRole('button', { name: 'Read the whole passage again' })
    .click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(submissions).toBe(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).readingTrack.readyState))
    .toBe('ended');
  await page
    .getByRole('button', { name: 'Start recording', exact: true })
    .click();
  await page.getByRole('link', { name: 'Deck', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).readingTrack.readyState))
    .toBe('ended');
  expect(submissions).toBe(1);
});

test('late microphone permissions are released after leaving reading', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      new Promise((resolve) => {
        (window as any).grantReading = () => {
          const stream = new AudioContext().createMediaStreamDestination()
            .stream;
          (window as any).readingTrack = stream.getAudioTracks()[0];
          resolve(stream);
        };
      });
  });
  await page.goto('/reading');
  await page
    .getByRole('button', { name: 'Start recording', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Deck', exact: true }).click();
  await page.evaluate(() => (window as any).grantReading());
  await expect
    .poll(() => page.evaluate(() => (window as any).readingTrack.readyState))
    .toBe('ended');
});

test('reading boundaries reject missing audio and cross-origin mutations', async ({
  request,
}) => {
  expect((await request.post('/api/reading')).status()).toBe(403);
  expect(
    (
      await request.post('/api/reading', {
        headers: { origin: 'http://127.0.0.1:5199' },
        multipart: { passageId: 'placement-0' },
      })
    ).status(),
  ).toBe(422);
  expect(
    (await request.get('/api/reading/recording?id=missing')).status(),
  ).toBe(404);
});
