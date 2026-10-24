import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
// Square, full-bleed copies: iOS paints transparent corners black and rounds the icon itself;
// Android crops maskable icons to its own shape (the artwork sits inside the 80 % safe zone).
const square = svg.replace(/ rx="\d+"/, '');
const renders = [
  { size: 192, source: svg, file: 'icon-192.png' },
  { size: 512, source: svg, file: 'icon-512.png' },
  { size: 512, source: square, file: 'icon-maskable-512.png' },
  { size: 180, source: square, file: 'apple-touch-icon.png' },
];
for (const { size, source, file } of renders) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${source.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  const png = await page.screenshot({
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  writeFileSync(`public/icons/${file}`, png);
  await page.close();
}
await browser.close();
console.log('icons rendered');
