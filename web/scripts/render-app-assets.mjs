// Renders the 1024 px icon and a 2732 px splash from public/icons/icon.svg for @capacitor/assets.
import { readFileSync, writeFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
const render = async (size, background, scale, file) => {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  const icon = Math.round(size * scale);
  const offset = Math.round((size - icon) / 2);
  await page.setContent(
    `<html><body style="margin:0;width:${size}px;height:${size}px;background:${background}">` +
      `<div style="position:absolute;left:${offset}px;top:${offset}px">` +
      svg.replace('<svg ', `<svg width="${icon}" height="${icon}" `) +
      `</div></body></html>`,
  );
  writeFileSync(file, await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } }));
  await page.close();
};
await render(1024, '#C2410C', 1, 'assets/icon-only.png');
await render(1024, '#C2410C', 1, 'assets/icon-foreground.png');
await render(1024, '#C2410C', 0, 'assets/icon-background.png');
await render(2732, '#F5F5F4', 0.25, 'assets/splash.png');
await render(2732, '#1C1917', 0.25, 'assets/splash-dark.png');
await browser.close();
console.log('app assets rendered');
