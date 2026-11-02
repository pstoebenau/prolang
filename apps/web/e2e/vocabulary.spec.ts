import { expect, test } from '@playwright/test';
import { vocabulary } from '../src/lib/skills/vocabulary';
const headers = { origin: 'http://127.0.0.1:5199' };

test('recognition placement saves separately and survives reload', async ({
  page,
}) => {
  await page.goto('/vocabulary');
  await page.getByRole('button', { name: 'Find my stage' }).first().click();
  for (let i = 0; i < 16; i++) {
    await expect(
      page.getByRole('region', { name: 'Vocabulary assessment' }),
    ).toContainText(`${i + 1} / 16`);
    await page
      .getByRole('button', { name: 'I do not know', exact: true })
      .click();
  }
  await expect(
    page.getByRole('region', { name: 'Vocabulary result' }),
  ).toContainText('Recognition · Starting');
  await expect(
    page.getByRole('region', { name: 'Vocabulary result' }),
  ).toContainText('0 of 16');
  await page.reload();
  await expect(page.locator('.skill-columns')).toContainText('0 / 16 correct');
  await expect(page.locator('.skill-columns')).toContainText(
    'Not assessed yet',
  );
});

test('recall answers are scored on server and cannot be submitted twice', async ({
  request,
  page,
}) => {
  const start = await request.post('/api/vocabulary', {
    headers,
    data: { action: 'start', mode: 'recall' },
  });
  expect(start.ok()).toBe(true);
  const session = await start.json();
  const body = {
    action: 'finish',
    id: session.id,
    answers: session.questions.map(
      (q: { itemId: string }) =>
        vocabulary.find((v) => v.id === q.itemId)!.german,
    ),
  };
  const finished = await request.post('/api/vocabulary', {
    headers,
    data: body,
  });
  expect(finished.ok()).toBe(true);
  const result = await finished.json();
  expect(result.answers.every((a: { correct: boolean }) => a.correct)).toBe(
    true,
  );
  expect(
    (await request.post('/api/vocabulary', { headers, data: body })).status(),
  ).toBe(409);
  await page.goto('/progress');
  await expect(
    page.getByText('Vocabulary active recall · Stretching', { exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.post('/api/vocabulary', {
        data: { action: 'start', mode: 'recall' },
      })
    ).status(),
  ).toBe(403);
});
