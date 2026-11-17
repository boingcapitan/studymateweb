import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'StudyMateWeb',
        short_name: 'StudyMate',
        description: 'Horario, tareas y asistente académico con IA',
        lang: 'es-MX',
        theme_color: '#2A4FD6',
        background_color: '#F2F5F9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js/], globIgnores: ['**/firebase-messaging-sw.js'] }
    })
  ]
});
