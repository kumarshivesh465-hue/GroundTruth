import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    // Allows the phone to reach the laptop's dev server on the same network.
    // For camera/mic access on the phone without HTTPS, prefer Chrome's
    // "port forwarding" over USB via chrome://inspect instead — see README.
    host: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GroundTruth',
        short_name: 'GroundTruth',
        description: 'Say what happened. The phone checks if it\'s true.',
        theme_color: '#028090',
        background_color: '#053B3E',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache the app shell so it opens even with zero connectivity.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
