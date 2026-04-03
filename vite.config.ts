import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Default env values — override via .env or deployment env vars
const ENV_DEFAULTS: Record<string, string> = {
  VITE_SITE_URL: 'https://essenceqc.ca',
}
for (const [key, value] of Object.entries(ENV_DEFAULTS)) {
  if (!process.env[key]) process.env[key] = value
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        id: '/',
        name: 'Essence QC — Prix de l\'essence au Québec en temps réel',
        short_name: 'Essence QC',
        description: 'Comparez les prix de l\'essence au Québec en temps réel. Carte interactive Google Maps, stations les moins chères près de vous, planificateur de trajet et mode Costco. Données officielles de la Régie de l\'énergie.',
        theme_color: '#003DA5',
        background_color: '#003DA5',
        display: 'standalone',
        display_override: ['standalone'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'fr-CA',
        dir: 'ltr',
        categories: ['utilities', 'navigation', 'finance'],
        prefer_related_applications: false,
        launch_handler: {
          client_mode: 'navigate-existing',
        },
        shortcuts: [
          {
            name: 'Carte des stations',
            short_name: 'Carte',
            url: '/?view=map',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Liste des prix',
            short_name: 'Liste',
            url: '/?view=list',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        screenshots: [
          {
            src: '/screenshots/mobile-map.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Carte interactive des stations-service',
          },
          {
            src: '/screenshots/mobile-list.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Liste des prix d\'essence par station',
          },
          {
            src: '/screenshots/desktop-map.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Vue carte sur ordinateur',
          },
        ],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/regieessencequebec\.ca\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'station-data',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
            },
          },
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-maps',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
