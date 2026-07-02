import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'Wortfuchs',
        short_name: 'Wortfuchs',
        description: 'Dein Vokabeltrainer',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#6B47E8',
        background_color: '#F4F1FA',
        icons: [
          { src: 'icons/fox-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/fox-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/fox-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
