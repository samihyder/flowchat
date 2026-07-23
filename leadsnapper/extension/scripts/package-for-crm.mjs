#!/usr/bin/env node
/**
 * Build LeadSnapper Chrome extension and zip it into FlowChat public downloads.
 */
import { execSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const extRoot = join(__dirname, '..')
const dist = join(extRoot, 'dist')
const repoRoot = join(extRoot, '..', '..')
const outDir = join(repoRoot, 'apps/web/public/downloads/leadsnapper')
const staging = join(outDir, '_unpacked')
const zipPath = join(outDir, 'leadsnapper-chrome.zip')

console.log('Building LeadSnapper extension…')
execSync('pnpm run build', { cwd: extRoot, stdio: 'inherit' })

if (!existsSync(join(dist, 'manifest.json'))) {
  throw new Error('dist/manifest.json missing after build')
}

mkdirSync(outDir, { recursive: true })
rmSync(staging, { recursive: true, force: true })
cpSync(dist, staging, { recursive: true })

rmSync(zipPath, { force: true })
execSync(`cd "${staging}" && zip -r -q "${zipPath}" .`, { stdio: 'inherit' })
rmSync(staging, { recursive: true, force: true })

writeFileSync(
  join(outDir, 'VERSION.txt'),
  `LeadSnapper Chrome 2.0.0 · built ${new Date().toISOString()}\n`
)

// Keep a copy of USAGE next to the zip for ops
const usageSrc = join(extRoot, '..', 'USAGE.md')
if (existsSync(usageSrc)) {
  copyFileSync(usageSrc, join(outDir, 'USAGE.md'))
}

console.log(`Packaged → ${zipPath}`)
