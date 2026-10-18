import { expect, test } from '@playwright/test';

// The first run creates a profile (a POST); saving the API's own address as the "server" sends
// it through the same redirect path a phone uses for a LAN server, which only GETs covered before.
test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript((base) => localStorage.setItem('coach.apiBaseUrl', base), baseURL ?? '');
});

test('a first visit is guided through permissions, profile and calibration', async ({
  page,
}, info) => {
  const name = `E2E Onboarding ${info.project.name}`;
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome\/?/);
  await expect(
    page.getByRole('heading', { name: /Bắt đầu với American English Coach/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cho phép micro và camera' }).click();
  await expect(page.getByRole('status')).toContainText('Micro: đã cho phép');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByLabel('Tên của bạn').fill(name);
  await page.getByRole('button', { name: 'Tạo hồ sơ và tiếp tục' }).click();
  await expect(page.getByRole('heading', { name: /Hiệu chỉnh khẩu hình/ })).toBeVisible();
  await page.getByRole('button', { name: 'Để sau, vào trang chủ' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: `Chào ${name}` })).toBeVisible();
  // Clean up the profile created for this run.
  await page.goto('/settings/');
  const row = page.locator('.profiles-card__row', { hasText: name });
  await page
    .locator('.profiles-card__row', { hasText: 'Người học' })
    .getByRole('button', { name: 'Dùng hồ sơ này' })
    .click();
  await row.getByRole('button', { name: 'Xóa' }).click();
  await row.getByRole('button', { name: 'Xóa hồ sơ' }).click();
  await expect(row).toHaveCount(0);
});
