import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  const png = await page.screenshot({
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  writeFileSync(`public/icons/icon-${size}.png`, png);
  await page.close();
}
await browser.close();
console.log('icons rendered');
