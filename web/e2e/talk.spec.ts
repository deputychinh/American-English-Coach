import { expect, test } from '@playwright/test';

// Plan v2 V3: speaking style on the device — pick the phrase that fits a situation and say it,
// then change a sentence by voice and hear whether the -ed ending was said. The real scorer
// grades the takes (the fake microphone says "think"), cards are kept in IndexedDB.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

test('a learner picks a phrase for the situation and says it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Luyện cách nói/ }).click();
  await expect(page.getByRole('heading', { name: 'Cách nói' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu 10 thẻ' }).click();
  await expect(page.getByText('Thẻ 1 / 10')).toBeVisible();
  await expect(page.getByText('Chào và giới thiệu')).toBeVisible();
  await page.getByRole('button', { name: "Hey, I'm Minh." }).click();
  await expect(page.getByRole('status')).toHaveText('Đúng rồi: câu thân mật.');

  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Bấm để nói' }).click();
  await page.waitForTimeout(1800);
  await page
    .getByRole('button', { name: 'Dừng' })
    .click({ timeout: 2000 })
    .catch(() => undefined);
  await expect(page.locator('.talk-card__feedback')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(page.getByText('Thẻ 2 / 10')).toBeVisible();

  // One card answered today: a reload offers the nine left.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bắt đầu 9 thẻ' })).toBeVisible();
});

test("a learner changes a unit's sentences to the past and the scorer checks -ed", async ({
  page,
}) => {
  await page.goto('/curriculum/');
  await page.locator('.curriculum-screen__unit--current').click();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Luyện cách nói của đơn vị này' })
    .click();
  await expect(page).toHaveURL(/\/talk\/?\?unit=u01/);
  await expect(page.getByRole('button', { name: 'Bắt đầu 7 thẻ' })).toBeVisible();

  await page.goto('/talk/?unit=u09');
  await expect(page.getByText('Luyện cụm giao tiếp và mẫu câu của đơn vị u09.')).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu 7 thẻ' }).click();
  for (let card = 1; card <= 3; card += 1) {
    await expect(page.getByText(`Thẻ ${String(card)} / 7`)).toBeVisible();
    await page.locator('.talk-card__choice').first().click();
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  }

  await expect(page.getByText('Thẻ 4 / 7')).toBeVisible();
  await expect(page.getByText('Quá khứ có đuôi -ed')).toBeVisible();
  await expect(page.getByText('I work until five.')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Bấm để nói' }).click();
  await page.waitForTimeout(1800);
  await page
    .getByRole('button', { name: 'Dừng' })
    .click({ timeout: 2000 })
    .catch(() => undefined);
  await expect(page.locator('.talk-card__verdict')).toBeVisible({ timeout: 60_000 });
  // "think" is not "worked": the scorer cannot have heard the -ed.
  await expect(page.locator('.talk-card__ending')).toContainText('-ed');
  await expect(page.locator('mark.talk-card__target')).toHaveText('worked');
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(page.getByText('Thẻ 5 / 7')).toBeVisible();
});
