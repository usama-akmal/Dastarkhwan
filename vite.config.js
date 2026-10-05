import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Dastarkhwan/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        id: '/Dastarkhwan/',
        name: 'Dastarkhwan — Meal Planner',
        short_name: 'Dastarkhwan',
        description: 'Daily Pakistani meal planning from your family\'s preferences, cooking history and dietary rules. Works offline.',
        theme_color: '#161a23',
        background_color: '#161a23',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Dastarkhwan/',
        start_url: '/Dastarkhwan/',
        icons: [
          {
            // Real PNG at the declared size. The previous icons were 1024x1024 JPEGs
            // named .png and declared 192/512, which is what Chrome validates against.
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // The app shell must be available offline immediately after install.
        navigateFallback: '/Dastarkhwan/index.html',
        cleanupOutdatedCaches: true,
        // No runtimeCaching for fonts any more: fonts are self-hosted from src/fonts,
        // so they are fingerprinted and precached like any other app asset. That is
        // what makes the offline-first claim hold on the very first launch, with no
        // request to a third-party CDN at any point.
      },
    })
  ],
})
