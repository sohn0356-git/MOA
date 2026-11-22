import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MOA/',
  build: { manifest: true },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/chapel-v1-favicon-32.png', 'icons/chapel-v1-touch-180.png'],
      manifest: {
        id: '/MOA/',
        name: 'MOA',
        short_name: 'MOA',
        description: 'MOA — 묵상·선교·교제를 함께하는 신앙 공간',
        start_url: '/MOA/',
        scope: '/MOA/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#f6f4ee',
        background_color: '#f6f7f4',
        icons: [
          {
            src: '/MOA/icons/chapel-v1-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/MOA/icons/chapel-v1-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/MOA/icons/chapel-v1-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webp,woff2}'],
      },
    }),
  ],
})
