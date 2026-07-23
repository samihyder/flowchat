// Builds background worker and content script using esbuild.
// These must be self-contained bundles — no dynamic imports, no crossorigin.
import { build } from 'esbuild'

const shared = {
  bundle: true,
  platform: 'browser',
  target: 'chrome114',
  sourcemap: true,
}

await build({
  ...shared,
  entryPoints: ['src/background/worker.ts'],
  outfile: 'dist/background.js',
  format: 'esm',
})

await build({
  ...shared,
  entryPoints: ['src/content/extractor.ts'],
  outfile: 'dist/content.js',
  format: 'iife',    // IIFE so it runs immediately when injected
})

console.log('✓ background.js and content.js built')
