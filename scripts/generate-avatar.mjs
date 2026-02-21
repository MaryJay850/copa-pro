/**
 * Generate CopaPro WhatsApp Group Avatar
 *
 * Creates a branded avatar image with:
 * - Green gradient background (WhatsApp themed)
 * - CopaPro branding
 * - WhatsApp icon
 * - Padel themed elements
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'public', 'whatsapp-group-avatar.png');

const SIZE = 512;

// Create SVG with CopaPro branding
const svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#075E54;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#128C7E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#25D366;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.15);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)" />
    </filter>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.5)" />
    </filter>
  </defs>

  <!-- Background gradient -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)" rx="40" />

  <!-- Subtle pattern overlay (court lines) -->
  <line x1="0" y1="${SIZE/2}" x2="${SIZE}" y2="${SIZE/2}" stroke="rgba(255,255,255,0.06)" stroke-width="2" />
  <line x1="${SIZE/2}" y1="0" x2="${SIZE/2}" y2="${SIZE}" stroke="rgba(255,255,255,0.06)" stroke-width="2" />
  <rect x="${SIZE*0.15}" y="${SIZE*0.15}" width="${SIZE*0.7}" height="${SIZE*0.7}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" rx="8" />

  <!-- Shine overlay -->
  <rect width="${SIZE}" height="${SIZE/2}" fill="url(#shine)" rx="40" />

  <!-- WhatsApp icon (simplified) -->
  <g transform="translate(${SIZE/2 - 60}, ${SIZE*0.18})" filter="url(#shadow)">
    <circle cx="60" cy="60" r="55" fill="white" opacity="0.95" />
    <g transform="translate(20, 18) scale(1.8)" fill="#25D366">
      <path d="M21.7 14.4c-.3-.1-1.8-.9-2-.9-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4s.2-1.3.2-1.4c-.1-.1-.3-.2-.6-.3m-5.4 7.4h0a9.9 9.9 0 01-5-1.4l-.4-.2-3.7 1 1-3.7-.2-.4A9.9 9.9 0 016 11.9C6 6.5 10.4 2 15.9 2c2.6 0 5.1 1 7 2.9a9.8 9.8 0 012.9 7c0 5.5-4.4 9.9-9.9 9.9m8.4-18.3A11.8 11.8 0 0012 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7a11.9 11.9 0 005.7 1.4h0c6.6 0 11.9-5.3 11.9-11.9a11.8 11.8 0 00-3.5-8.4z"/>
    </g>
  </g>

  <!-- CopaPro text -->
  <text x="${SIZE/2}" y="${SIZE*0.62}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="72"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        filter="url(#textShadow)"
        letter-spacing="3">CopaPro</text>

  <!-- Subtitle -->
  <text x="${SIZE/2}" y="${SIZE*0.72}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="22"
        fill="rgba(255,255,255,0.85)"
        text-anchor="middle"
        letter-spacing="6">PADEL LEAGUE</text>

  <!-- Padel racket + ball icon (bottom) -->
  <g transform="translate(${SIZE/2 - 30}, ${SIZE*0.78})" opacity="0.7">
    <!-- Ball -->
    <circle cx="42" cy="28" r="10" fill="rgba(255,255,255,0.8)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
    <path d="M35 22 C38 28, 46 28, 49 22" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
    <path d="M35 34 C38 28, 46 28, 49 34" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
    <!-- Racket -->
    <ellipse cx="18" cy="20" rx="16" ry="22" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2.5" />
    <!-- Racket grid -->
    <line x1="18" y1="2" x2="18" y2="38" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" />
    <line x1="8" y1="4" x2="8" y2="36" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" />
    <line x1="28" y1="4" x2="28" y2="36" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" />
    <line x1="3" y1="12" x2="33" y2="12" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" />
    <line x1="2" y1="20" x2="34" y2="20" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" />
    <line x1="3" y1="28" x2="33" y2="28" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" />
    <!-- Handle -->
    <line x1="18" y1="42" x2="18" y2="60" stroke="rgba(255,255,255,0.8)" stroke-width="4" stroke-linecap="round" />
  </g>
</svg>`;

async function main() {
  const buffer = await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();

  writeFileSync(OUTPUT, buffer);
  console.log(`✅ Avatar gerado: ${OUTPUT} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
