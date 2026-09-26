import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MOA/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        id: '/MOA/',
        name: 'MOA - My Own Apps',
        short_name: 'MOA',
        description: 'My Own Apps',
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
