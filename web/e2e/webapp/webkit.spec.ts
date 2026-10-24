import { expect, type Page, test } from '@playwright/test';

import { installFakeMic } from './fake-mic';

// The same journey as webapp.spec.ts, in WebKit (Safari's engine, the only one iPhones have):
// download the scoring pack, score a take in the browser, then score again offline. It records
// how long the download and each score took, as a first read before W5 on a real iPhone.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
  await installFakeMic(page);
});

const recordAndScore = async (page: Page): Promise<number> => {
  await page.goto('/practice/?item=pair:think-sink:0');
  await page.getByRole('button', { name: 'Thu âm' }).click();
  await expect(page.getByRole('button', { name: /Dừng/ })).toBeVisible();
  await page.waitForTimeout(1800);
  const stoppedAt = Date.now();
  await page
    .getByRole('button', { name: /Dừng/ })
    .click({ timeout: 2000 })
    .catch(() => undefined);
  await expect(page.locator('.verdict-chip').first()).toBeVisible({ timeout: 180_000 });
  await expect(page.locator('.verdict-chip')).toHaveCount(4);
  return Date.now() - stoppedAt;
};

test('Safari (WebKit) downloads the pack, scores in the browser and keeps scoring offline', async ({
  page,
  context,
}) => {
  const api: string[] = [];
  page.context().on('request', (request) => {
    if (request.url().includes('/api/')) api.push(new URL(request.url()).pathname);
  });
  const note = (type: string, description: string): void => {
    test.info().annotations.push({ type, description });
  };

  await page.goto('/');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  const pack = page.locator('.model-download-card');
  const startedAt = Date.now();
  await pack.getByRole('button', { name: 'Tải ngay' }).click();
  await expect(pack).toHaveCount(0, { timeout: 300_000 });
  note('download', `${String(Date.now() - startedAt)} ms`);

  note('first score', `${String(await recordAndScore(page))} ms`);
  note('second score', `${String(await recordAndScore(page))} ms`);

  await context.setOffline(true);
  note('offline score', `${String(await recordAndScore(page))} ms`);
  await context.setOffline(false);
  expect(api).toEqual([]);
});
