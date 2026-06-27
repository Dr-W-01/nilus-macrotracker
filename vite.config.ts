import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const PWA_ICONS = [
  { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png' },
  { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
  { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
  { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
  { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png' },
  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png' },
  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  { src: 'icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
] as const

// https://vite.dev/config/
export default defineConfig({
  base: '/nilus-macrotracker/',
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'apple-touch-icon.png',
        'icon-1024.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
      ],
      manifest: {
        name: 'NullTracker',
        short_name: 'NullTracker',
        description: 'Private, local-first calorie & macro tracking',
        theme_color: '#171717',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/nilus-macrotracker/',
        icons: [...PWA_ICONS],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/nilus-macrotracker/index.html',
        navigateFallbackDenylist: [/^\/_/],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})