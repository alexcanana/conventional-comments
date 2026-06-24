import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const blue = '#1f6bff';
const size = 128;
const cornerRadius = 29;
const centerY = 64;
const radius = 23.5;
const thickness = 17;
const gap = 4;
const leftCenterX = 47;
const rightCenterX = 91;
const startDegrees = 45;
const endDegrees = 315;
const stepDegrees = 2;

function arcPath(centerX) {
  const points = [];
  for (let degrees = startDegrees; degrees <= endDegrees + 1e-6; degrees += stepDegrees) {
    const radians = (degrees * Math.PI) / 180;
    points.push([centerX + radius * Math.cos(radians), centerY - radius * Math.sin(radians)]);
  }

  return (
    'M' +
    points.map(([x, y], index) => `${index ? 'L' : ''}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${blue}"/>
  <path d="${arcPath(leftCenterX)}" fill="none" stroke="#fff" stroke-width="${thickness}" stroke-linecap="butt"/>
  <path d="${arcPath(rightCenterX)}" fill="none" stroke="${blue}" stroke-width="${thickness + 2 * gap}" stroke-linecap="butt"/>
  <path d="${arcPath(rightCenterX)}" fill="none" stroke="#fff" stroke-width="${thickness}" stroke-linecap="butt"/>
</svg>`;

const targets = [
  { path: 'public/icons/icon-16.png', pixels: 16 },
  { path: 'public/icons/icon-32.png', pixels: 32 },
  { path: 'public/icons/icon-48.png', pixels: 48 },
  { path: 'public/icons/icon-128.png', pixels: 128 },
  { path: 'branding/icon-512.png', pixels: 512 },
  { path: 'branding/icon-1024.png', pixels: 1024 },
];

mkdirSync(resolve(root, 'branding'), { recursive: true });
writeFileSync(resolve(root, 'branding/icon.svg'), svg);

const browser = await chromium.launch();
for (const target of targets) {
  const page = await browser.newPage({
    viewport: { width: target.pixels, height: target.pixels },
    deviceScaleFactor: 1,
  });
  const sized = svg.replace(
    `width="${size}" height="${size}"`,
    `width="${target.pixels}" height="${target.pixels}"`,
  );
  await page.setContent(`<style>*{margin:0;padding:0}svg{display:block}</style>${sized}`);
  await page.screenshot({ path: resolve(root, target.path), omitBackground: true });
  await page.close();
}

await browser.close();
console.log('Generated icons in public/icons and branding');
