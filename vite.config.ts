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
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        id: '/MOA/',
        name: 'MOA Faith',
        short_name: 'MOA Faith',
        description: '말씀과 묵상, 기도를 함께 나누는 신앙 공간',
        start_url: '/MOA/',
        scope: '/MOA/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#146c43',
        background_color: '#f6f7f4',
        icons: [
          {
            src: '/MOA/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/MOA/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/MOA/icons/maskable-512x512.png',
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
