import { expect, type Page, test } from '@playwright/test';

import { apiHeaders } from './api-headers';
import { e2eDeviceToken } from './env';
import { expectModelVoice, watchModelVoice } from './model-voice';

test.beforeEach(async ({ page }) => {
  // Every journey here starts as a returning learner; e2e/onboarding.spec.ts covers the first run.
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

/** Documentation screenshots; a capture hiccup on a CI runner must never fail a journey. */
const shot = async (page: Page, name: string, project: string): Promise<void> => {
  try {
    await page.screenshot({ path: `../docs/screenshots/${name}-${project}.png`, fullPage: true });
  } catch (error) {
    test.info().annotations.push({
      type: 'screenshot-skipped',
      description: `${name}-${project}: ${String(error)}`,
    });
  }
};

test('home stays quiet when the API is ready and shows quick entries', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hôm nay luyện gì' })).toBeVisible();
  await expect(page.locator('.api-status-banner')).toHaveCount(0);
  await expect(page.locator('.home-screen__continue-level')).toContainText(/Cấp 1 · \d+\/6 đơn vị/);
  await expect(page.getByRole('link', { name: /Luyện ngay/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hôm nay luyện gì' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Tiến độ mục tiêu hôm nay' })).toBeVisible();
  await expect(page.locator('.week-strip__day')).toHaveCount(7);
  await expect(page.locator('.home-screen__continue')).toHaveAttribute(
    'href',
    /lesson\/?\?unit=u01/,
  );
  await expect(page.locator('.home-screen__tile')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Cài đặt' })).toBeVisible();
  await shot(page, 'home', info.project.name);
});

test('sounds chart renders 44 cards with camera badges and a detail panel', async ({
  page,
}, info) => {
  const clips = watchModelVoice(page);
  await page.goto('/sounds/?id=v01');
  await expect(page.locator('.sound-chart__card')).toHaveCount(44);
  await expect(page.locator('.sound-chart__card .confidence-badge')).toHaveCount(44);
  await expect(page.getByRole('heading', { name: /\/iː\// })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Luyện âm này' })).toHaveAttribute(
    'href',
    /sound=v01/,
  );
  await page
    .getByRole('button', { name: /^Nghe mẫu: / })
    .first()
    .click();
  await expectModelVoice(page, clips);
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
  // A single word ends after a short pause, so the take may already have stopped by itself.
  await page
    .getByRole('button', { name: /Dừng/ })
    .click({ timeout: 2000 })
    .catch(() => undefined);
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
  const clips = watchModelVoice(page);
  await page.goto('/practice/?item=pair:think-sink:0');
  await expect(page.getByRole('button', { name: 'Thu âm' })).toBeVisible();
  // The model voice must come through on a paired phone too (it went silent with a 401 once).
  await page.getByRole('button', { name: 'Nghe mẫu' }).click();
  await expectModelVoice(page, clips);
  await page.getByRole('button', { name: 'Thu âm' }).click();
  await expect(page.getByRole('button', { name: /Dừng/ })).toBeVisible();
  await page.waitForTimeout(1800);
  // A single word ends after a short pause, so the take may already have stopped by itself.
  await page
    .getByRole('button', { name: /Dừng/ })
    .click({ timeout: 2000 })
    .catch(() => undefined);
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
  await expect(page.locator('.speak-check, .feature-chips').first().or(notice)).toBeVisible();
  await shot(page, 'mirror', info.project.name);
  if ((await notice.count()) > 0) {
    await page.getByRole('link', { name: 'Hiệu chỉnh ngay' }).click();
  } else {
    await page.getByRole('button', { name: 'Tùy chọn' }).click();
    await page.getByRole('link', { name: 'Hiệu chỉnh lại' }).click();
  }
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible();
  await expect(page.locator('video')).toBeVisible();
  await shot(page, 'calibration', info.project.name);
});

test('the mirror scores a spoken word with sound and mouth together', async ({ page, request }) => {
  const range = { min: 0, max: 1 };
  await request.put('/api/v1/calibration', {
    headers: apiHeaders(),
    data: {
      features: {
        aperture: range,
        width: range,
        roundness: range,
        jaw: range,
        lipClosed: range,
        lowerLipTuck: range,
        teethVisible: range,
        tongueVisible: range,
      },
    },
  });
  const clips = watchModelVoice(page);
  await page.goto('/mirror/?sound=TH');
  const word = page.locator('.speak-check__word');
  await expect(word).not.toBeEmpty();
  await page.getByRole('button', { name: 'Nghe mẫu' }).click();
  await expectModelVoice(page, clips);
  await page.getByRole('button', { name: 'Tự nói lại: Bật' }).click();
  await page.getByRole('button', { name: 'Nói thử' }).click();
  const stop = page.getByRole('button', { name: 'Dừng và chấm' });
  await expect(stop).toBeVisible();
  await page.waitForTimeout(2500);
  // The deck stops by itself at the end of speech; the fake microphone may loop without a pause.
  // The deck may stop by itself between the check and the tap; either way it scores.
  await stop.click({ timeout: 2000 }).catch(() => undefined);
  await expect(page.locator('.speak-check__result')).toContainText(/Âm \/θ\//, { timeout: 60_000 });
  await expect(page.locator('.speak-check__result')).toContainText(/Khẩu hình/);
  await expect(page.getByRole('button', { name: 'Nghe lại bản ghi của bạn' })).toBeEnabled();
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
  await page.getByRole('button', { name: /^Luyện tập/ }).click();
  await expect(page.getByRole('checkbox', { name: /Mặc định bật camera/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Mục tiêu và nhắc luyện/ }).click();
  await page.getByRole('tab', { name: '5 lần' }).click();
  await expect(page.getByRole('tab', { name: '5 lần' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Địa chỉ máy chấm/ }).click();
  await page.getByRole('button', { name: 'Lưu và kiểm tra' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Kết nối được/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Ghép nối điện thoại/ }).click();
  // Phone mode runs already paired; otherwise the form waits for the six-digit code.
  if (e2eDeviceToken()) {
    await expect(page.getByRole('button', { name: 'Hủy ghép nối' })).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: 'Ghép nối', exact: true })).toBeDisabled();
  }
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(page, 'settings', info.project.name);
  await page.getByRole('tab', { name: 'Sáng' }).click();
});

test('the course lists 14 days with the current one open', async ({ page }, info) => {
  await page.goto('/course/');
  await expect(page.getByRole('heading', { name: /Khóa 14 ngày/ })).toBeVisible();
  await expect(page.locator('.course-screen__day')).toHaveCount(14);
  await page.locator('.course-screen__day--current').click();
  await expect(page.getByRole('dialog').locator('.course-screen__item').first()).toHaveAttribute(
    'href',
    /practice/,
  );
  await shot(page, 'course', info.project.name);
});

test('the curriculum lists levels and opens the current unit with five steps', async ({
  page,
}, info) => {
  await page.goto('/curriculum/');
  await expect(page.getByRole('heading', { name: 'Lộ trình phát âm chuẩn' })).toBeVisible();
  await expect(page.locator('.curriculum-screen__unit')).toHaveCount(24);
  await expect(page.getByRole('heading', { name: 'Cấp 4 · Thuần thục' })).toBeAttached();
  await page.locator('.curriculum-screen__unit--current').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.locator('.unit-steps__step')).toHaveCount(5);
  await expect(sheet.locator('.unit-steps__chip').first()).toHaveAttribute('href', /sounds/);
  await shot(page, 'curriculum', info.project.name);
});

test('a new learner takes the placement check and lands on a level', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Bạn mới bắt đầu\?/ }).click();
  await expect(page).toHaveURL(/placement/);
  const clips = watchModelVoice(page);
  await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click();
  await page.getByRole('button', { name: 'Phát âm thanh' }).click();
  await expectModelVoice(page, clips);
  const options = page.locator('.listen-question-card__option');
  for (let i = 0; i < 16; i += 1) {
    if ((await page.locator('.placement-screen__level').count()) > 0) break;
    await options.first().click();
    await page.getByRole('button', { name: /Câu tiếp theo|Xem kết quả/ }).click();
  }
  await expect(page.locator('.placement-screen__level')).toHaveText(/Cấp \d/);
  await expect(page.locator('.placement-screen__score')).toHaveCount(4);
  await page.getByRole('link', { name: 'Bắt đầu học' }).click();
  await expect(page.locator('.home-screen__placement')).toHaveCount(0);
  await expect(page.locator('.home-screen__continue')).toHaveAttribute('href', /unit=u\d\d/);
});

test('the listening step asks one question at a time and ends with a summary', async ({
  page,
}, info) => {
  const clips = watchModelVoice(page);
  await page.goto('/listen/?unit=u03');
  await expect(page.getByRole('heading', { name: 'Nghe phân biệt' })).toBeVisible();
  await page.getByRole('button', { name: 'Phát âm thanh' }).click();
  await expectModelVoice(page, clips);
  const options = page.locator('.listen-question-card__option');
  await expect(options.first()).toBeVisible();
  await shot(page, 'listen', info.project.name);
  for (let i = 0; i < 12; i += 1) {
    if ((await page.locator('.listen-screen__summary').count()) > 0) break;
    await options.first().click();
    await expect(page.locator('.listen-question-card__feedback')).not.toBeEmpty();
    await page.getByRole('button', { name: /Câu tiếp theo|Xem kết quả/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Kết quả nghe' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sang bước luyện có chấm' })).toBeVisible();
  await page.goto('/curriculum/');
  await page.locator('.curriculum-screen__unit').filter({ hasText: '/θ/' }).click();
  await expect(page.getByRole('link', { name: /Đã nghe · \d+%/ })).toBeVisible();
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
  await page.getByRole('button', { name: /^Hồ sơ người học/ }).click();
  const card = page.locator('#profiles');
  await expect(card.getByText('Đang dùng', { exact: true })).toBeVisible();
  const name = `E2E ${Date.now().toString().slice(-5)}`;
  await card.getByLabel('Tên hồ sơ mới').fill(name);
  await card.getByRole('button', { name: 'Tạo hồ sơ' }).click();
  const row = card.locator('.profiles-card__row', { hasText: name });
  await expect(row).toHaveAttribute('aria-current', 'true');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: `Chào ${name}` })).toBeVisible();
  await page.goto('/settings/#profiles');
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
