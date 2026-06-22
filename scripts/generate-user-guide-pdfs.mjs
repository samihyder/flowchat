#!/usr/bin/env node
/**
 * Generate branded PDFs from user guide markdown files.
 * Usage: node scripts/generate-user-guide-pdfs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const docsDir = path.join(root, 'docs');
const pdfDir = path.join(docsDir, 'pdf');
const logoPath = path.join(docsDir, 'logo.svg');
const cssPath = path.join(pdfDir, 'print.css');

const jobs = [
  {
    input: path.join(docsDir, 'LEADSNAPPER_USER_GUIDE.md'),
    output: path.join(pdfDir, 'LeadSnapper-User-Guide.pdf'),
    title: 'LeadSnapper User Guide',
    product: 'leadsnapper',
    quickRef: false,
  },
  {
    input: path.join(docsDir, 'FLOWCHAT_USER_GUIDE.md'),
    output: path.join(pdfDir, 'FlowChat-User-Guide.pdf'),
    title: 'FlowChat User Guide',
    product: 'flowchat',
    quickRef: false,
  },
  {
    input: path.join(docsDir, 'quick-reference', 'LEADSNAPPER_QUICK_REFERENCE.md'),
    output: path.join(pdfDir, 'LeadSnapper-Quick-Reference.pdf'),
    title: 'LeadSnapper Quick Reference',
    product: 'leadsnapper',
    quickRef: true,
  },
  {
    input: path.join(docsDir, 'quick-reference', 'FLOWCHAT_QUICK_REFERENCE.md'),
    output: path.join(pdfDir, 'FlowChat-Quick-Reference.pdf'),
    title: 'FlowChat Quick Reference',
    product: 'flowchat',
    quickRef: true,
  },
];

function headerHtml(product, title) {
  const logoUri = `data:image/svg+xml;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  if (product === 'flowchat') {
    return `
      <div class="doc-header">
        <img class="logo" src="${logoUri}" alt="FlowChat" />
        <div class="meta">
          <strong>${title}</strong>
          Mutex Systems · Sales Team
        </div>
      </div>`;
  }
  return `
    <div class="doc-header">
      <div class="brand-text">Lead<span>Snapper</span></div>
      <div class="meta">
        <strong>${title}</strong>
        Mutex Systems · Sales Team
      </div>
    </div>`;
}

function wrapHtml(body, { title, product, quickRef }) {
  const css = fs.readFileSync(cssPath, 'utf8');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${css}</style>
</head>
<body class="${quickRef ? 'quick-ref' : 'full-guide'}">
  ${headerHtml(product, title)}
  <main>${body}</main>
  <div class="footer">FlowChat &amp; LeadSnapper · digitalbrandcast.com/FlowChat · Confidential — internal sales use</div>
</body>
</html>`;
}

async function main() {
  const { mdToPdf } = await import('md-to-pdf');
  fs.mkdirSync(pdfDir, { recursive: true });

  for (const job of jobs) {
    const md = fs.readFileSync(job.input, 'utf8');
    const htmlBody = await marked.parse(md);
    const html = wrapHtml(htmlBody, job);

    await mdToPdf(
      { content: html },
      {
        dest: job.output,
        css: cssPath,
        pdf_options: {
          format: 'A4',
          printBackground: true,
          margin: { top: '12mm', right: '14mm', bottom: '14mm', left: '14mm' },
        },
        launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
      }
    );

    console.log(`✓ ${path.basename(job.output)}`);
  }

  console.log(`\nPDFs saved to ${pdfDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
