import { expect, type Page, test } from '@playwright/test';

// Controlled offline (roadmap B4): once a screen has been opened with the API reachable, the
// service worker keeps the shell, the lesson data and the history, so the same screens still read
// with the scoring server gone. Scoring itself needs the API and the home banner says so.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

const cachedApiPaths = (page: Page): Promise<string[]> =>
  page.evaluate(async () => {
    const cache = await caches.open('coach-api-v1');
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });

/** Opens a screen online and waits until the worker has stored the API response it needs. */
const warm = async (page: Page, path: string, apiPath: string): Promise<void> => {
  await page.goto(path);
  await expect.poll(() => cachedApiPaths(page), { timeout: 15_000 }).toContain(apiPath);
};

test('lessons, history and the mirror stay readable without the scoring server', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await warm(page, '/', '/api/v1/plan');
  await warm(page, '/sounds/?id=v01', '/api/v1/content/sounds/v01');
  await warm(page, '/progress/', '/api/v1/progress');
  await warm(page, '/mirror/?sound=UW', '/api/v1/calibration');
  await warm(page, '/course/', '/api/v1/course');

  await context.setOffline(true);
  try {
    await page.goto('/sounds/?id=v01');
    await expect(page.locator('.sound-chart__card')).toHaveCount(44);
    await expect(page.getByRole('heading', { name: /\/iː\// })).toBeVisible();

    await page.goto('/progress/');
    await expect(page.getByRole('heading', { name: /Theo từng âm/ })).toBeVisible();
    await expect(page.locator('.stat')).toHaveCount(4);
    await expect(page.locator('.week-strip__day')).toHaveCount(7);

    await page.goto('/mirror/?sound=UW');
    const notice = page.getByRole('status').filter({ hasText: /Cần hiệu chỉnh/ });
    await expect(notice.or(page.locator('.mirror-guide'))).toBeVisible();

    await page.goto('/course/');
    await expect(page.getByRole('heading', { name: 'Khóa 14 ngày cho người Việt' })).toBeVisible();

    await page.goto('/');
    await expect(page.locator('.api-status-banner')).toContainText('Bạn vẫn xem được bài học');
    await expect(page.locator('.week-strip__day')).toHaveCount(7);

    // A route that was never built still lands on the cached home shell instead of an error page.
    await page.goto('/khong-ton-tai/');
    await expect(page.locator('.api-status-banner')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
