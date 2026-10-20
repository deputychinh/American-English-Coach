import { expect, type Page, test } from '@playwright/test';

// Plan B1: a whole unit on one player — describe, listen, controlled (with the 2-of-3 gate),
// guided, communicate — resuming at the same screen after a reload.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

const banner = (page: Page) => page.locator('.lesson-banner__step');

/** Skips speaking items until the banner leaves the given step. */
const skipStep = async (page: Page, step: RegExp): Promise<void> => {
  for (let i = 0; i < 20; i += 1) {
    if ((await banner(page).count()) === 0) return;
    if (!step.test((await banner(page).textContent()) ?? '')) return;
    await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
    await page.waitForTimeout(150);
  }
};

test('a learner goes through all five steps of a unit and resumes after a reload', async ({
  page,
}) => {
  // u09, not the current unit: the take below is stored on the shared test server, and the
  // placement journey needs a learner with nothing done in the current unit.
  const unit = page.locator('.curriculum-screen__unit').filter({ hasText: 'đuôi -ed' });
  await page.goto('/curriculum/');
  await unit.click();
  await page.getByRole('link', { name: 'Bắt đầu bài học' }).click();

  // 1 · describe
  await expect(page.locator('.lesson-header__subtitle')).toHaveText(/Bước 1\/5 · Làm quen âm/);
  await expect(page.locator('.lesson-describe__card').first()).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu nghe' }).click();

  // 2 · listen
  await expect(page.locator('.lesson-header__subtitle')).toHaveText(/Bước 2\/5/);
  const options = page.locator('.listen-question-card__option');
  for (let i = 0; i < 20; i += 1) {
    if ((await page.locator('.listen-question-card').count()) === 0) break;
    await options.first().click();
    await page.getByRole('button', { name: /Câu tiếp theo|Xem kết quả/ }).click();
  }

  // 3 · controlled: one real take, then skip to the gate
  await expect(banner(page)).toHaveText(/Bước 3\/5 · Luyện từng từ · 1\//);
  // The test server renders the listening prompts with `say` one at a time; let it finish so the
  // recorder's worklet is not queued behind them (the phone loads it from the app bundle).
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Thu âm' }).click();
  await page.waitForTimeout(1800);
  await page
    .getByRole('button', { name: /Dừng/ })
    .click({ timeout: 2000 })
    .catch(() => undefined);
  await expect(page.locator('.verdict-chip').first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(banner(page)).toHaveText(/· 2\//);

  // Closing the app mid-step brings the learner back to the same screen.
  await page.reload();
  await expect(banner(page)).toHaveText(/Bước 3\/5 · Luyện từng từ · 2\//);

  await skipStep(page, /Bước 3\//);
  await expect(page.getByRole('heading', { name: 'Kiểm tra trước khi đi tiếp' })).toBeVisible();
  await page.getByRole('button', { name: 'Vẫn đi tiếp' }).click();

  // 4 · guided and 5 · communicate
  await expect(banner(page)).toHaveText(/Bước 4\/5/);
  await skipStep(page, /Bước 4\//);
  await expect(banner(page)).toHaveText(/Bước 5\/5/);
  await expect(page.locator('.lesson-banner__partner')).toContainText('What did you do yesterday?');
  await skipStep(page, /Bước 5\//);

  await expect(page.getByRole('heading', { name: 'Xong bài học!' })).toBeVisible();
  await page.getByRole('link', { name: 'Về lộ trình' }).click();
  await unit.click();
  await expect(page.getByRole('link', { name: 'Học lại bài này' })).toBeVisible();
});
