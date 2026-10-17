import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Every journey here starts as a returning learner; e2e/onboarding.spec.ts covers the first run.
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

/** Documentation screenshots; a capture hiccup on a CI runner must never fail a journey. */
const shot = async (page: Page, name: string, project: string): Promise<void> => {
  try {
    await page.screenshot({ path: `../docs/screenshots/${name}-${project}.png`, fullPage: true });
  } catch (error) {
    console.warn(`screenshot ${name}-${project} skipped: ${String(error)}`);
  }
};

test('home shows the API status and quick entries', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('.api-status-banner')).toContainText(/Máy chấm/);
  await expect(page.getByRole('link', { name: /Luyện ngay/ }).first()).toBeVisible();
  await expect(page.locator('.stat')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Hôm nay luyện gì' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Tiến độ mục tiêu hôm nay' })).toBeVisible();
  await expect(page.locator('.week-strip__day')).toHaveCount(7);
  await expect(page.getByRole('link', { name: /Luyện ngay/ }).nth(1)).toBeVisible();
  await expect(page.getByRole('link', { name: /Luyện cặp âm/ })).toBeVisible();
  await shot(page, 'home', info.project.name);
});

test('sounds chart renders 44 cards with camera badges and a detail panel', async ({
  page,
}, info) => {
  await page.goto('/sounds/?id=v01');
  await expect(page.locator('.sound-chart__card')).toHaveCount(44);
  await expect(page.locator('.sound-chart__card .confidence-badge')).toHaveCount(44);
  await expect(page.getByRole('heading', { name: /\/iː\// })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Luyện âm này' })).toHaveAttribute(
    'href',
    /sound=v01/,
  );
  await shot(page, 'sounds', info.project.name);
});

test('practice lists all 44 sounds with badges', async ({ page }, info) => {
  await page.goto('/practice/');
  await expect(page.getByRole('tab', { name: 'Theo âm' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.sound-list__card')).toHaveCount(44);
  await expect(page.locator('.sound-list__card .confidence-badge')).toHaveCount(44);
  await shot(page, 'practice-sounds', info.project.name);
  await page.getByRole('tab', { name: 'Cặp âm & câu' }).click();
  await expect(page.getByRole('link', { name: 'think' }).first()).toBeVisible();
});

test('a sound drill records, scores the target phone and advances', async ({ page }, info) => {
  await page.goto('/practice/?sound=c09');
  await expect(page.locator('.drill-session__progress')).toContainText(/Bài 1 \//);
  await expect(page.locator('.drill-session__head .confidence-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Thu âm' }).click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /Dừng/ }).click();
  await expect(page.locator('.verdict-chip').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.drill-session__tally')).toContainText(/1 lần|bỏ qua/);
  await shot(page, 'drill-result', info.project.name);
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await expect(page.locator('.drill-session__progress')).toContainText(/Bài 2 \//);
  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(page.locator('.drill-session__progress')).toContainText(/Bài 3 \//);
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
  // A learner who already calibrated on this API host sees the guide instead of the notice.
  const notice = page.getByRole('status').filter({ hasText: /Cần hiệu chỉnh/ });
  const guide = page.locator('.mirror-guide');
  await expect(notice.or(guide)).toBeVisible();
  await expect(page.locator('.confidence-badge').or(notice)).toBeVisible();
  await shot(page, 'mirror', info.project.name);
  const enter = (await notice.count()) > 0 ? 'Hiệu chỉnh ngay' : 'Hiệu chỉnh lại';
  await page.getByRole('link', { name: enter }).click();
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible();
  await expect(page.locator('video')).toBeVisible();
  await shot(page, 'calibration', info.project.name);
});

test('progress shows stats, the ranked table and a link to settings', async ({ page }, info) => {
  await page.goto('/progress/');
  await expect(page.getByRole('heading', { name: /Theo từng âm/ })).toBeVisible();
  await expect(page.locator('.stat')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Tuần này' })).toBeVisible();
  await expect(page.locator('.week-strip__day')).toHaveCount(7);
  await expect(page.getByRole('link', { name: /Mở cài đặt/ })).toBeVisible();
  await shot(page, 'progress', info.project.name);
});

test('settings has theme, server check, pairing and data sections', async ({ page }, info) => {
  await page.goto('/settings/');
  await expect(page.getByRole('heading', { name: 'Cài đặt', level: 1 })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Mặc định bật camera/ })).toBeVisible();
  await page.getByRole('tab', { name: '5 lần' }).click();
  await expect(page.getByRole('tab', { name: '5 lần' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Lưu và kiểm tra' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Kết nối được/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ghép nối' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(page, 'settings', info.project.name);
  await page.getByRole('tab', { name: 'Sáng' }).click();
});

test('the course lists 14 days with the current one open', async ({ page }, info) => {
  await page.goto('/course/');
  await expect(page.getByRole('heading', { name: /Khóa 14 ngày/ })).toBeVisible();
  await expect(page.locator('.course-screen__day')).toHaveCount(14);
  await expect(page.locator('details[open]')).toHaveCount(1);
  await expect(page.locator('details[open] .course-screen__item').first()).toHaveAttribute(
    'href',
    /practice/,
  );
  await shot(page, 'course', info.project.name);
});

test('the interface switches to English and back from settings', async ({ page }) => {
  await page.goto('/settings/');
  await page.getByRole('tab', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Practise now/ }).first()).toBeVisible();
  await page.goto('/settings/');
  await page.getByRole('tab', { name: 'Tiếng Việt' }).click();
  await expect(page.getByRole('heading', { name: 'Cài đặt', level: 1 })).toBeVisible();
});

test('profiles can be created, switched, renamed and deleted from settings', async ({ page }) => {
  await page.goto('/settings/');
  const card = page.locator('#profiles');
  await expect(card.getByText('Đang dùng', { exact: true })).toBeVisible();
  const name = `E2E ${Date.now().toString().slice(-5)}`;
  await card.getByLabel('Tên hồ sơ mới').fill(name);
  await card.getByRole('button', { name: 'Tạo hồ sơ' }).click();
  const row = card.locator('.profiles-card__row', { hasText: name });
  await expect(row).toHaveAttribute('aria-current', 'true');
  await page.goto('/');
  await expect(page.getByRole('link', { name: `Hồ sơ: ${name}` })).toBeVisible();
  await page.goto('/settings/');
  await card
    .locator('.profiles-card__row', { hasText: 'Người học' })
    .getByRole('button', { name: 'Dùng hồ sơ này' })
    .click();
  await row.getByRole('button', { name: 'Xóa' }).click();
  await row.getByRole('button', { name: 'Xóa hồ sơ' }).click();
  await expect(row).toHaveCount(0);
});

test('the shell shows a bottom tab bar on phones and a header nav on desktop', async ({
  page,
}, info) => {
  await page.goto('/');
  const tabbar = page.locator('.app-shell__tabbar');
  const nav = page.locator('.app-shell__nav');
  if (info.project.name === 'mobile') {
    await expect(tabbar).toBeVisible();
    await expect(nav).toBeHidden();
    await tabbar.getByRole('link', { name: 'Luyện tập' }).click();
    await expect(page).toHaveURL(/\/practice\//);
  } else {
    await expect(nav).toBeVisible();
    await expect(tabbar).toBeHidden();
  }
});
