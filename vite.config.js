import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Dastarkhwan/',
  plugins: [
    react(),
    VitePWA({
      // `prompt` rather than `autoUpdate`. With `autoUpdate` the plugin forcibly sets
      // `workbox.skipWaiting = true` (vite-plugin-pwa dist/index.js), which makes a new
      // worker activate the moment it installs — reloading the page out from under the
      // user, potentially mid-task, and leaving no chance to show a prompt. With
      // `prompt` the new worker waits, and the app asks before reloading.
      registerType: 'prompt',
      // The app registers the worker itself (src/pwa/useServiceWorkerUpdate.js) so it
      // can detect a waiting update and offer a reload. Letting the plugin inject its
      // own registration as well would register the same worker twice.
      injectRegister: null,
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
        // `skipWaiting` defaults to true, which makes a new worker activate the
        // instant it installs. That reloaded the page out from under the user
        // (potentially mid-task) and left no opportunity to show an update prompt.
        // With it off, the new worker waits until the user accepts, and
        // `skipWaiting()` is called from src/pwa/useServiceWorkerUpdate.js.
        skipWaiting: false,
        clientsClaim: true,
        // No runtimeCaching for fonts any more: fonts are self-hosted from src/fonts,
        // so they are fingerprinted and precached like any other app asset. That is
        // what makes the offline-first claim hold on the very first launch, with no
        // request to a third-party CDN at any point.
      },
    })
  ],
})
