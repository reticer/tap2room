import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    allowedHosts: ['.loca.lt', 'warm-parrots-bathe.loca.lt'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'iconpwa.png', 'masked-icon.svg'],
      manifest: {
        name: 'tap2room',
        short_name: 'tap2room',
        description: 'Smart e-commerce platform for your apartment',
        theme_color: '#f2f2f7',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'iconpwa.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'iconpwa.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'iconpwa.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
})
