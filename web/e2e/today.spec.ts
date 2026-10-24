import { expect, type Page, test } from '@playwright/test';

// Plan v2 V5: "Hôm nay 15 phút". The session is worked out from what the screens store, so a
// part done from it is ticked when the learner comes back, and a reload (closing the app)
// keeps the place. The fake microphone loops "think".

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

const step = (page: Page, name: string) =>
  page.locator('.today-screen__step').filter({ hasText: name });

test("a learner works through today's parts and the session resumes after a reload", async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.today-home-card').getByRole('link', { name: 'Bắt đầu 15 phút' }).click();
  await expect(page).toHaveURL(/\/today\/?$/);
  await expect(page.locator('.lesson-header__subtitle')).toHaveText('0/4 phần');
  await expect(step(page, 'Ôn từ vựng')).toContainText('Tiếp theo');

  // The speaking part, opened from the session, leads back to it when done.
  await step(page, 'Nói 3 lần').click();
  await expect(page).toHaveURL(/\/fluency\/?\?unit=u\d+&from=today/);
  for (const [index, seconds] of [
    [1, 60],
    [2, 45],
    [3, 30],
  ]) {
    await page
      .getByRole('button', { name: `Bắt đầu lần ${String(index)} · ${String(seconds)} giây` })
      .click();
    await expect(page.getByRole('timer')).toBeVisible();
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'Xong sớm' }).click();
    await page.getByRole('button', { name: /Tiếp: lần|Xem kết quả/ }).click({ timeout: 20_000 });
  }
  await page.getByRole('link', { name: 'Tiếp tục phiên hôm nay' }).click();
  await expect(step(page, 'Nói 3 lần')).toContainText('Xong');
  await expect(page.locator('.lesson-header__subtitle')).toHaveText('1/4 phần');

  // The unit part is done once its lesson moves on from where the session found it.
  await step(page, 'Bước tiếp của đơn vị').click();
  await expect(page).toHaveURL(/\/lesson\/?\?unit=u\d+&from=today/);
  await page.getByRole('button', { name: 'Bắt đầu nghe' }).click();
  await expect(page.locator('.lesson-header__subtitle')).toHaveText(/Bước 2\/5/);
  await page.getByRole('link', { name: 'Đóng' }).click();
  await expect(page).toHaveURL(/\/today\/?$/);
  await expect(step(page, 'Bước tiếp của đơn vị')).toContainText('Xong');

  // Closing the app: the same two parts are still done, the review is still next.
  await page.reload();
  await expect(page.locator('.lesson-header__subtitle')).toHaveText('2/4 phần');
  await expect(step(page, 'Ôn từ vựng')).toContainText('Tiếp theo');
  await expect(page.getByRole('link', { name: 'Tiếp tục: Ôn từ vựng' })).toHaveAttribute(
    'href',
    /\/vocab\/?\?from=today/,
  );

  await page.goto('/');
  await expect(page.locator('.today-home-card')).toContainText('Đã xong 2/4 phần');
});
