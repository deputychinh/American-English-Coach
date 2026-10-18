import { expect, type Locator, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

/** Drags with the mouse, which the browser reports as pointer events like a finger. */
const drag = async (
  page: Page,
  target: Locator,
  { dx = 0, dy = 0 }: { dx?: number; dy?: number },
): Promise<void> => {
  // Sheets slide in: wait until the target stops moving before grabbing it.
  let box = await target.boundingBox();
  await expect
    .poll(async () => {
      const next = await target.boundingBox();
      const isStill = next !== null && box !== null && next.y === box.y && next.x === box.x;
      box = next;
      return isStill;
    })
    .toBe(true);
  if (!box) throw new Error('target not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
};

test('a sheet closes when its title bar is dragged down', async ({ page }) => {
  await page.goto('/sounds/?id=v01');
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await drag(page, sheet.locator('.sheet__head'), { dy: 260 });
  await expect(sheet).toBeHidden();
});

test('a short drag springs the sheet back open', async ({ page }) => {
  await page.goto('/sounds/?id=v01');
  const sheet = page.getByRole('dialog');
  await drag(page, sheet.locator('.sheet__head'), { dy: 12 });
  await expect(sheet).toBeVisible();
});

test('swiping the mirror word moves to the next and back', async ({ page, request }) => {
  // The mirror opens its deck only once a calibration exists.
  const range = { min: 0, max: 1 };
  const names = ['aperture', 'width', 'roundness', 'jaw', 'lipClosed', 'lowerLipTuck'];
  const extra = ['teethVisible', 'tongueVisible'];
  const features = Object.fromEntries([...names, ...extra].map((name) => [name, range]));
  await request.put('/api/v1/calibration', { data: { features } });
  await page.goto('/mirror/?sound=TH');
  const word = page.locator('.speak-check__word');
  await expect(word).not.toBeEmpty();
  const first = await word.textContent();
  await drag(page, page.locator('.speak-check__word-box'), { dx: -140 });
  await expect(word).not.toHaveText(first ?? '');
  await drag(page, page.locator('.speak-check__word-box'), { dx: 140 });
  await expect(word).toHaveText(first ?? '');
});
