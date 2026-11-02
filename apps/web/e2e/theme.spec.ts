import { expect, test } from '@playwright/test';

test('theme overrides reach surfaces, controls, navigation and focus', async ({
  page,
}) => {
  await page.goto('/deck');
  await page.addStyleTag({
    content: `:root {
    --background: rgb(240, 230, 220);
    --foreground: rgb(30, 40, 50);
    --card: rgb(220, 230, 240);
    --input: rgb(100, 110, 120);
    --accent: rgb(210, 200, 190);
    --accent-foreground: rgb(50, 40, 30);
    --ring: rgb(120, 70, 140);
    --radius: 14px;
  }`,
  });
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(240, 230, 220)',
  );
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(30, 40, 50)');
  const input = page.getByRole('searchbox');
  await expect(input).toHaveCSS('background-color', 'rgb(220, 230, 240)');
  await expect(input).toHaveCSS('border-top-color', 'rgb(100, 110, 120)');
  await expect(input).toHaveCSS('border-top-left-radius', '12px');
  await input.focus();
  await expect(input).toHaveCSS('outline-color', 'rgb(120, 70, 140)');
  await input.fill('Mutter');
  await expect(page.locator('[data-testid="deck-row"]')).toHaveCount(2);
  const active = page.getByRole('link', { name: 'Deck', exact: true });
  await expect(active).toHaveCSS('background-color', 'rgb(210, 200, 190)');
  await expect(active).toHaveCSS('color', 'rgb(50, 40, 30)');
  await expect(active).toHaveCSS('text-decoration-line', 'none');
  await expect(page.getByRole('combobox')).toHaveCSS(
    'border-top-color',
    'rgb(100, 110, 120)',
  );
});

test('button links and destructive actions use semantic theme colors', async ({
  page,
}) => {
  await page.goto('/settings');
  await page.addStyleTag({
    content: `:root {
    --destructive: rgb(100, 30, 50);
    --destructive-foreground: rgb(250, 230, 240);
    --input: rgb(100, 110, 120);
  }`,
  });
  const action = page.getByRole('button', { name: 'Replace with backup' });
  await expect(action).toHaveCSS('background-color', 'rgb(100, 30, 50)');
  await expect(action).toHaveCSS('color', 'rgb(250, 230, 240)');
  const download = page.getByRole('link', { name: 'Export JSON backup' });
  await expect(download).toHaveAttribute('data-slot', 'button');
  await expect(download).toHaveCSS('border-top-color', 'rgb(100, 110, 120)');
  await expect(download).toHaveAttribute('download', '');
});

test('practice comparison reflows without horizontal overflow', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/practice?retry=2');
  await page
    .getByRole('button', { name: 'Reveal answer', exact: true })
    .click();
  const workspace = page.getByRole('region', { name: 'Practice workspace' });
  const answer = page.getByTestId('answer');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const recallBounds = await workspace
      .locator(':scope > div')
      .first()
      .boundingBox();
    const answerBounds = await answer.boundingBox();
    expect(recallBounds).not.toBeNull();
    expect(answerBounds).not.toBeNull();
    if (width === 390) {
      expect(answerBounds!.y).toBeGreaterThanOrEqual(
        recallBounds!.y + recallBounds!.height,
      );
      expect(answerBounds!.x).toBe(recallBounds!.x);
    } else {
      expect(answerBounds!.x).toBeGreaterThan(
        recallBounds!.x + recallBounds!.width,
      );
      expect(answerBounds!.y).toBe(recallBounds!.y);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(answer).toHaveCSS('animation-name', 'none');
  }
});
