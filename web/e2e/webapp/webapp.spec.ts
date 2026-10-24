import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// The installable web app on a static host: there is no scoring server at all. The learner
// downloads the scoring pack once, the browser scores takes with ONNX Runtime Web, and after
// that practice keeps working offline. The fake microphone says "think".

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

/** Every request the page (and its workers) sends to `pathPart`. */
const watch = (page: Page, pathPart: string): string[] => {
  const hits: string[] = [];
  page.context().on('request', (request) => {
    if (request.url().includes(pathPart)) hits.push(new URL(request.url()).pathname);
  });
  return hits;
};

const recordAndScore = async (page: Page): Promise<void> => {
  await page.goto('/practice/?item=pair:think-sink:0');
  await page.getByRole('button', { name: 'Thu âm' }).click();
  await expect(page.getByRole('button', { name: /Dừng/ })).toBeVisible();
  await page.waitForTimeout(1800);
  await page
    .getByRole('button', { name: /Dừng/ })
    .click({ timeout: 2000 })
    .catch(() => undefined);
  await expect(page.locator('.verdict-chip').first()).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('.verdict-chip')).toHaveCount(4);
};

test('the web app downloads the scoring pack once, scores in the browser and works offline', async ({
  page,
  context,
}) => {
  const api = watch(page, '/api/');
  const parts = watch(page, '/models/w2v.mm8/part-');

  await page.goto('/');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await expect(page.locator('.api-status-banner')).toHaveCount(0);
  const pack = page.locator('.model-download-card');
  await expect(pack.getByRole('heading', { name: 'Tải gói chấm điểm' })).toBeVisible();
  await pack.getByRole('button', { name: 'Tải ngay' }).click();
  await expect(pack.getByRole('progressbar')).toBeVisible();
  await expect(pack).toHaveCount(0, { timeout: 300_000 });
  expect(parts).toHaveLength(15);

  await recordAndScore(page);
  await page.goto('/progress/');
  await expect(page.locator('.stat').first()).toBeVisible();

  // Offline: the shell comes from the service worker, the model from Cache Storage.
  await context.setOffline(true);
  await recordAndScore(page);
  await context.setOffline(false);

  expect(parts).toHaveLength(15);
  expect(api).toEqual([]);
});

test.describe('on an iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });

  test('home explains how to add the app to the home screen until "Not now"', async ({ page }) => {
    await page.goto('/');
    // Safari drops a site's storage after 7 days unused: install before the 357 MB download.
    await expect(page.locator('.model-download-card__note')).toContainText('màn hình chính');
    const card = page.locator('.install-app-card');
    await expect(card.getByRole('heading', { name: 'Cài app lên màn hình chính' })).toBeVisible();
    await expect(card.getByRole('listitem')).toHaveCount(3);
    const axe = await new AxeBuilder({ page }).include('.install-app-card').analyze();
    expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual(
      [],
    );
    await card.getByRole('button', { name: 'Để sau' }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.home-screen__continue')).toBeVisible();
    await expect(page.locator('.install-app-card')).toHaveCount(0);
  });

  test('the manifest and icons make it installable', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = (await (await request.get(href ?? '')).json()) as {
      display: string;
      icons: { src: string; purpose?: string }[];
    };
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await request.get(apple ?? '')).ok()).toBe(true);
    for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  });
});
