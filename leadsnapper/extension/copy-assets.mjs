// Copies manifest.json, icons, and renames the sidepanel HTML to its correct name.
import fs from 'fs'
import path from 'path'

// Manifest
fs.copyFileSync('manifest.json', 'dist/manifest.json')

// Error handler (must be a separate file — MV3 CSP blocks inline scripts)
fs.copyFileSync('error-handler.js', 'dist/error-handler.js')

// Icons
fs.mkdirSync('dist/icons', { recursive: true })
for (const f of ['icon16.png', 'icon48.png', 'icon128.png']) {
  fs.copyFileSync(`icons/${f}`, `dist/icons/${f}`)
}

// Vite outputs the HTML as dist/sidepanel.html — verify it exists
if (!fs.existsSync('dist/sidepanel.html')) {
  // Vite may have placed it differently; find it
  const candidates = fs.readdirSync('dist').filter(f => f.endsWith('.html'))
  console.warn('Expected dist/sidepanel.html, found:', candidates)
} else {
  console.log('✓ dist/sidepanel.html OK')
}

console.log('✓ manifest.json and icons copied')
