import { expect, type Page, test } from '@playwright/test';

// Plan A6: the App Store build answers its own API. With local mode on and every request to the
// scoring server blocked, each screen must still load its content, progress and plan.

test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('coach.onboarded', 'true');
    localStorage.setItem('coach.forceLocalMode', 'true');
  });
  await context.route('**/api/v1/**', (route) => route.abort('internetdisconnected'));
});

const serverRequests = (page: Page): string[] => {
  const hits: string[] = [];
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/v1/')) hits.push(new URL(request.url()).pathname);
  });
  return hits;
};

test('home, curriculum, sounds and practice work without the scoring server', async ({ page }) => {
  const hits = serverRequests(page);
  await page.goto('/');
  await expect(page.locator('.home-screen__continue')).toBeVisible();
  await expect(page.locator('.api-status-banner')).toHaveCount(0);

  await page.goto('/curriculum/');
  await expect(page.locator('.curriculum-screen__unit').first()).toBeVisible();

  await page.goto('/sounds/?id=c09');
  await expect(page.locator('.sound-chart__card')).toHaveCount(44);
  await expect(page.getByRole('heading', { name: /\/θ\// })).toBeVisible();

  await page.goto('/practice/');
  await expect(page.locator('.sound-list__item, .sound-list a').first()).toBeVisible();

  await page.goto('/practice/?sound=c09');
  await expect(page.getByRole('button', { name: 'Thu âm' })).toBeVisible();
  expect(hits).toEqual([]);
});

test('progress, the weekly plan, the course and profiles work without the scoring server', async ({
  page,
}) => {
  const hits = serverRequests(page);
  await page.goto('/progress/');
  await expect(page.locator('.stat')).toHaveCount(4);

  await page.goto('/course/');
  await expect(page.locator('.course-screen__day, .list-row').first()).toBeVisible();

  await page.goto('/settings/');
  await page.getByRole('button', { name: /^Hồ sơ người học/ }).click();
  await expect(page.getByText('Người học').first()).toBeVisible();
  expect(hits).toEqual([]);
});
