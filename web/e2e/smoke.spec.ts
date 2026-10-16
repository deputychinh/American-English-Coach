import { expect, type Page, test } from '@playwright/test';

const shot = (page: Page, name: string, project: string): Promise<Buffer> =>
  page.screenshot({ path: `../docs/screenshots/${name}-${project}.png`, fullPage: true });

test('home shows the API status and quick entries', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('.api-status-banner')).toContainText(/Máy chấm/);
  await expect(page.getByRole('link', { name: /Luyện cặp âm/ })).toBeVisible();
  await shot(page, 'home', info.project.name);
});

test('sounds chart renders 44 cards and a detail panel', async ({ page }, info) => {
  await page.goto('/sounds/?id=v01');
  await expect(page.locator('.sound-chart__card')).toHaveCount(44);
  await expect(page.getByRole('heading', { name: /\/iː\// })).toBeVisible();
  await shot(page, 'sounds', info.project.name);
});

test('practice records with the fake microphone and shows a result card', async ({
  page,
}, info) => {
  await page.goto('/practice/?item=pair:think-sink:0');
  await expect(page.getByRole('button', { name: 'Thu âm' })).toBeVisible();
  await page.getByRole('button', { name: 'Thu âm' }).click();
  await expect(page.getByRole('button', { name: /Dừng/ })).toBeVisible();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /Dừng/ }).click();
  const chips = page.locator('.verdict-chip');
  await expect(chips.first()).toBeVisible({ timeout: 60_000 });
  await expect(chips).toHaveCount(4);
  await chips.first().click();
  await expect(page.locator('.phone-detail')).toBeVisible();
  await expect(page.locator('.result-card')).toBeVisible();
  await expect(page.locator('.skeleton')).toHaveCount(0);
  await shot(page, 'practice-result', info.project.name);
});

test('mirror asks for calibration first, then calibration page opens the camera', async ({
  page,
}, info) => {
  await page.goto('/mirror/?sound=UW');
  await expect(page.getByRole('status')).toContainText(/Cần hiệu chỉnh/);
  await shot(page, 'mirror', info.project.name);
  await page.getByRole('link', { name: 'Hiệu chỉnh ngay' }).click();
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible();
  await expect(page.locator('video')).toBeVisible();
  await shot(page, 'calibration', info.project.name);
});

test('progress lists runs and settings', async ({ page }, info) => {
  await page.goto('/progress/');
  await expect(page.getByRole('heading', { name: /Theo từng âm/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Mặc định bật camera/ })).toBeVisible();
  await shot(page, 'progress', info.project.name);
});
