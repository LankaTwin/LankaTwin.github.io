import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import seoPages from './scripts/seo-pages.ts'

// Served from the root of lankatwin.github.io with real paths (/station/kandy); the build
// writes an HTML file per page (scripts/seo-pages.ts) and a 404.html fallback for the rest.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    seoPages(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'LankaTwin — Lankan Technical Weather Information Network',
        short_name: 'LankaTwin',
        description: 'The Lankan Technical Weather Information Network: live weather, rivers, floods, river gauges, air quality and satellite views for Sri Lanka.',
        theme_color: '#0E6E78',
        background_color: '#F2F5F4',
        display: 'standalone',
        id: '/',
        start_url: '/',
        scope: '/',
        lang: 'en',
        dir: 'ltr',
        orientation: 'any',
        categories: ['weather', 'utilities', 'news'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Live dashboard', url: '/live', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Floods', url: '/floods', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'River gauges', url: '/gauges', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Signals', url: '/alerts', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // The app shell only: the per-page HTML files are for crawlers and first visits, and
        // share images (og/*.jpg) are only fetched by social sites.
        globPatterns: ['index.html', '**/*.{js,css,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(sitemap\.xml|robots\.txt)$/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Last good API answers stay readable offline.
            urlPattern: /^https:\/\/([a-z-]+\.)?(open-meteo\.com|power\.larc\.nasa\.gov)\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'lt-api', networkTimeoutSeconds: 8, expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 3 } },
          },
          {
            // Irrigation Department gauges on ArcGIS Online: live first, last readings offline.
            urlPattern: /^https:\/\/services\d*\.arcgis\.com\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'lt-gauges', networkTimeoutSeconds: 10, expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 2 } },
          },
          {
            urlPattern: /^https:\/\/(basemaps\.cartocdn\.com|[a-d]\.basemaps\.cartocdn\.com|tiles\.basemaps\.cartocdn\.com)\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'lt-basemap', expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            // Cloudinary URLs are versioned by their transformation; safe to keep a month.
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'lt-cloudinary', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Place photos and their credits change rarely.
            urlPattern: /^https:\/\/(en\.wikipedia\.org\/(api\/rest_v1|w\/api\.php)|upload\.wikimedia\.org\/)/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'lt-photos', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }, cacheableResponse: { statuses: [0, 200] } },
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
