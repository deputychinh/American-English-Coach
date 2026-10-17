import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/welcome/',
  '/sounds/',
  '/practice/',
  '/practice/?sound=c09',
  '/mirror/',
  '/calibration/',
  '/progress/',
  '/settings/',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coach.onboarded', 'true'));
});

for (const route of ROUTES) {
  test(`${route} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      serious.map(
        (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
      ),
    ).toEqual([]);
  });
}
