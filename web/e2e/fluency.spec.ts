import { expect, type Page, test } from '@playwright/test';

// Plan v2 V4: "Nói 3 lần" on the device. The fake microphone loops "think"; each round is
// stopped early and measured from the audio alone (no scorer), then compared side by side.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

const speak = async (page: Page, start: string): Promise<void> => {
  await page.getByRole('button', { name: start }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Xong sớm' }).click();
};

test('a learner talks about a topic three times and sees the rounds side by side', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Nói 3 lần:/ }).click();
  await expect(page.getByRole('heading', { name: /Giới thiệu bản thân/ })).toBeVisible();

  await page.getByRole('combobox', { name: 'Đổi chủ đề' }).selectOption('u09');
  await expect(page.getByRole('heading', { name: /Hôm qua bạn đã làm gì/ })).toBeVisible();

  await speak(page, 'Bắt đầu lần 1 · 60 giây');
  await expect(page.getByText('Xong lần 1.')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Tiếp: lần 2 · 45 giây' }).click();
  await speak(page, 'Bắt đầu lần 2 · 45 giây');
  await page.getByRole('button', { name: 'Tiếp: lần 3 · 30 giây' }).click({ timeout: 20_000 });
  await speak(page, 'Bắt đầu lần 3 · 30 giây');
  await page.getByRole('button', { name: 'Xem kết quả' }).click({ timeout: 20_000 });

  await expect(page.getByRole('heading', { name: 'Xong 3 lần!' })).toBeVisible();
  await expect(page.locator('.fluency-table__cell')).toHaveCount(9);
  await expect(page.getByText(/Lần cuối so với lần đầu:/)).toBeVisible();
  // Content feedback (V6) sits under the rounds; whether the server has an AI tutor depends on
  // its .env, and the test never sends text to it.
  await expect(page.getByRole('region', { name: 'Góp ý nội dung (AI)' })).toBeVisible();
  const trend = page.getByRole('region', { name: 'Xu hướng của bạn' });
  await expect(trend.getByRole('listitem')).toHaveCount(1);

  // The session is kept on the device: a reload still shows it in the trend.
  await page.reload();
  await expect(trend.getByRole('listitem')).toHaveCount(1);
});

test("the unit sheet links to three rounds on the unit's topic", async ({ page }) => {
  await page.goto('/curriculum/');
  await page.locator('.curriculum-screen__unit--current').click();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Nói 3 lần về chủ đề của đơn vị này' })
    .click();
  await expect(page).toHaveURL(/\/fluency\/?\?unit=u01/);
  await expect(page.getByRole('heading', { name: /Giới thiệu bản thân/ })).toBeVisible();
});
