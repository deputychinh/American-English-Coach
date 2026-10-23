import { expect, type Page, test } from '@playwright/test';

// Plan v2 V2c: a vocabulary session on the device — new listening cards, then a speaking card
// scored by the real scorer (the fake microphone says "think"), all kept in IndexedDB.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

const DAY = 86_400_000;

/** A listening card for "today" learnt a month ago: its speaking card opens now. */
const seedStableListening = async (page: Page): Promise<void> => {
  await page.evaluate(async (day) => {
    const now = Date.now();
    const card = {
      id: 'w.today#listen',
      profileId: 'default',
      itemId: 'w.today',
      mode: 'listen',
      phase: 'review',
      due: new Date(now + 30 * day).toISOString(),
      stability: 30,
      difficulty: 4,
      scheduledDays: 30,
      learningSteps: 0,
      reps: 4,
      lapses: 0,
      lastReview: new Date(now - day).toISOString(),
      createdAt: new Date(now - 60 * day).toISOString(),
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('coach', 2);
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error ?? new Error('open failed'));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('cards', 'readwrite');
      transaction.objectStore('cards').put(card);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('write failed'));
    });
    database.close();
  }, DAY);
};

test('a learner reviews new words by ear, then says one and the scorer grades it', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Ôn từ vựng/ }).click();
  await expect(page.getByRole('heading', { name: 'Từ vựng' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu ôn 20 thẻ' }).click();

  for (let card = 1; card <= 10; card += 1) {
    await expect(page.getByText(`Thẻ ${String(card)} / 20`)).toBeVisible();
    await page.locator('.vocab-card__choice').first().click();
    await expect(page.locator('.vocab-reveal__text')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  }
  await expect(page.getByText('Thẻ 11 / 20')).toBeVisible();

  // Ten cards were introduced today: after a reload only ten new ones are left.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bắt đầu ôn 10 thẻ' })).toBeVisible();

  await seedStableListening(page);
  await page.reload();
  await page.getByRole('button', { name: /^Bắt đầu ôn/ }).click();
  await expect(page.getByText('Nói bằng tiếng Anh:')).toBeVisible();
  await expect(page.locator('.vocab-card__meaning')).toHaveText('hôm nay');
  // Let the model voices finish so the recorder's worklet is not queued behind them.
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Bấm để nói' }).click();
  await page.waitForTimeout(1800);
  await page
    .getByRole('button', { name: 'Dừng' })
    .click({ timeout: 2000 })
    .catch(() => undefined);
  await expect(page.locator('.vocab-card__verdict')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.vocab-reveal__text')).toHaveText('today');
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(page.getByText(/Thẻ 2 \//)).toBeVisible();
});
