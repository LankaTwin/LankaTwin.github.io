import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base + HashRouter means the build works at any GitHub Pages path
// (user.github.io/LankaTwin/ or a custom domain) without changing config.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LankaTwin — Sri Lanka environmental twin',
        short_name: 'LankaTwin',
        description: 'Live weather, rivers, air quality and satellite views for Sri Lanka.',
        theme_color: '#0E6E78',
        background_color: '#F2F5F4',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Last good API answers stay readable offline.
            urlPattern: /^https:\/\/([a-z-]+\.)?(open-meteo\.com|power\.larc\.nasa\.gov)\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'lt-api', networkTimeoutSeconds: 8, expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 3 } },
          },
          {
            urlPattern: /^https:\/\/(basemaps\.cartocdn\.com|[a-d]\.basemaps\.cartocdn\.com|tiles\.basemaps\.cartocdn\.com)\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'lt-basemap', expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/gibs\.earthdata\.nasa\.gov\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'lt-gibs', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 2 } },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) return 'maplibre'
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
        },
      },
    },
  },
})
