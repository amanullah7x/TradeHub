// Renders the app icons in app/assets from the logo artwork. Run with: npm run icons
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (name) => path.join(root, 'app', 'assets', name);

const GRADIENT = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#14B8A6"/><stop offset="1" stop-color="#0F766E"/></linearGradient></defs>`;

const arrows = (top, bottom) => `
  <g fill="none" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 24H46M38.5 16.5L46 24L38.5 31.5" stroke="${top}"/>
    <path d="M47 40H18M25.5 32.5L18 40L25.5 47.5" stroke="${bottom}"/>
  </g>`;

// scale shrinks the arrows around the centre (Android crops adaptive icons to the middle ~66%).
const svg = ({ background, radius = 0, top = '#FFFFFF', bottom = '#FDBA74', scale = 1 }) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${GRADIENT}
    ${background ? `<rect width="64" height="64" rx="${radius}" fill="url(#g)"/>` : ''}
    <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${arrows(top, bottom)}</g>
  </svg>`;

const render = (markup, size, file) =>
  sharp(Buffer.from(markup), { density: 72 * (size / 64) }).resize(size, size).png().toFile(out(file));

await Promise.all([
  render(svg({ background: true }), 1024, 'icon.png'),
  render(svg({ background: true, radius: 16 }), 512, 'splash-icon.png'),
  render(svg({ background: true, radius: 14 }), 96, 'favicon.png'),
  render(svg({ background: true, scale: 0 }), 512, 'android-icon-background.png'),
  render(svg({ background: false, scale: 0.6 }), 512, 'android-icon-foreground.png'),
  render(svg({ background: false, scale: 0.6, top: '#FFFFFF', bottom: '#FFFFFF' }), 432, 'android-icon-monochrome.png'),
  sharp(path.join(root, 'branding', 'logo.svg'), { density: 300 }).png().toFile(path.join(root, 'branding', 'logo.png')),
  sharp(path.join(root, 'branding', 'logo-mark.svg'), { density: 1152 }).resize(1024, 1024).png().toFile(path.join(root, 'branding', 'logo-mark.png')),
]);
console.log('Icons written to app/assets and branding/');
