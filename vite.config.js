import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

function versionEmitterPlugin() {
  const buildTime = Date.now();
  return {
    name: 'version-emitter',
    configureServer(server) {
      server.middlewares.use('/version.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          version: 'dev',
          buildTime: 0
        }));
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          version: process.env.npm_package_version || '1.0.0',
          buildTime: buildTime
        })
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const buildTime = Date.now();

  return {
    define: {
      __APP_BUILD_TIME__: JSON.stringify(isProd ? buildTime : 0),
    },
    plugins: [
      react(),
      tailwindcss(),
      versionEmitterPlugin(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['logo.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        },
        manifest: {
          name: 'LifeTracker',
          short_name: 'LifeTracker',
          description: 'Track your habits, shopping, todos, and expenses all in one place',
          theme_color: '#060b14',
          background_color: '#060b14',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ]
  };
})

