import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Remove crossorigin from every script/link tag.
// chrome-extension:// resources don't return CORS headers, so crossorigin
// on modulepreload links causes a silent CORS failure → blank screen.
function noCrossorigin(): Plugin {
  return {
    name: 'no-crossorigin',
    transformIndexHtml: {
      order: 'post',
      handler: (html: string) =>
        html.replace(/ crossorigin(="[^"]*")?/g, ''),
    },
  }
}

export default defineConfig({
  plugins: [react(), noCrossorigin()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { sidepanel: resolve(__dirname, 'sidepanel.html') },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
