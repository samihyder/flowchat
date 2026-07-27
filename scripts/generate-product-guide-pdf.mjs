#!/usr/bin/env node
/**
 * Generate the premium FlowChat Product Guide PDF (marketing collateral).
 * Uses system Chrome for reliable backgrounds, PNG logos, and screens.
 * Usage: node scripts/generate-product-guide-pdf.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const marketingDir = path.join(root, 'docs', 'marketing');
const htmlPath = path.join(marketingDir, 'FLOWCHAT_PRODUCT_GUIDE.html');
const outPath = path.join(root, 'docs', 'pdf', 'FlowChat-Product-Guide.pdf');

const chromeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  return chromeCandidates.find((p) => fs.existsSync(p));
}

function toDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.svg'
          ? 'image/svg+xml'
          : 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function main() {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing guide HTML: ${htmlPath}`);
  }

  const chrome = findChrome();
  if (!chrome) {
    throw new Error('Google Chrome / Chromium not found. Set PUPPETEER_EXECUTABLE_PATH.');
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Inline brand marks + screens as data URIs so print never loses assets
  const replacements = {
    './icon.png': path.join(marketingDir, 'icon.png'),
    './logo.png': path.join(marketingDir, 'logo.png'),
    './icon.svg': path.join(marketingDir, 'icon.svg'),
    './logo.svg': path.join(marketingDir, 'logo.svg'),
  };
  for (const [rel, abs] of Object.entries(replacements)) {
    if (fs.existsSync(abs)) {
      html = html.replaceAll(`src="${rel}"`, `src="${toDataUri(abs)}"`);
    }
  }

  const screensDir = path.join(marketingDir, 'screens');
  for (const file of fs.readdirSync(screensDir)) {
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const abs = path.join(screensDir, file);
    html = html.replaceAll(`src="./screens/${file}"`, `src="${toDataUri(abs)}"`);
  }

  const tmpPath = path.join(marketingDir, '.product-guide-render.html');
  fs.writeFileSync(tmpPath, html, 'utf8');
  const fileUrl = pathToFileURL(tmpPath).href;

  try {
    const result = spawnSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        '--disable-extensions',
        `--print-to-pdf=${outPath}`,
        fileUrl,
      ],
      { encoding: 'utf8' }
    );
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `Chrome exited ${result.status}`);
    }
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }

  if (!fs.existsSync(outPath)) {
    throw new Error('PDF was not written');
  }

  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✓ FlowChat-Product-Guide.pdf (${sizeMb} MB)`);
  console.log(`  → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
