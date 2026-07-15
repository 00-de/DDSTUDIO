import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'node:path'
import { copyFileSync, mkdirSync } from 'node:fs'

// splash.html を dist-electron へコピーする（パッケージ後も参照できるように）
function copySplash() {
  return {
    name: 'copy-splash',
    closeBundle() {
      try {
        mkdirSync(resolve(__dirname, 'dist-electron'), { recursive: true })
        copyFileSync(resolve(__dirname, 'electron/splash.html'), resolve(__dirname, 'dist-electron/splash.html'))
      } catch (e) {
        console.warn('splash.html のコピーに失敗:', e)
      }
    },
  }
}

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        // Main process
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['ffmpeg-static', 'electron-updater'],
            },
          },
        },
      },
      {
        // Preload
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    renderer(),
    copySplash(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
