import fs from 'fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Auto-detect HTTPS based on server URL environment variable
const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:5109';
const shouldUseHttps = serverUrl.startsWith('https://');

// Certificate paths (only used if HTTPS is needed)
const certPath = '/home/sunri-pi1/vite-certs/fullchain.pem';
const keyPath = '/home/sunri-pi1/vite-certs/privkey.pem';
const hasCertificates = fs.existsSync(certPath) && fs.existsSync(keyPath);

// Define registered frontend routes (must match your React Router routes)
const registeredRoutes = [
  '/',
  '/rec',
  '/test-plan/test-cases',
  '/test-plan/campaigns',
  '/test-plan/collections',
  '/test-execution/run-tests',
  '/test-execution/monitoring',
  '/test-results/reports',
  '/test-results/model-reports',
  '/test-results/dependency-report',
  '/configuration',
  '/configuration/',
  '/configuration/devices',
  '/configuration/models',
  '/configuration/interface',
  '/configuration/controller',
  '/configuration/library',
  '/configuration/environment',
  // Dynamic routes patterns
  '/navigation-editor', // Will match /navigation-editor/* paths
];

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin for route validation
    {
      name: 'route-validator',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';

          // Skip static assets, API routes, and other proxied paths
          if (
            url.startsWith('/assets/') ||
            url.startsWith('/server/') ||
            url.startsWith('/host/') ||
            url.startsWith('/websockify') ||
            url.includes('.') // Static files (js, css, images, etc.)
          ) {
            return next();
          }

          // Check if the route is registered
          const isRegisteredRoute = registeredRoutes.some((route) => {
            if (route === url) return true;
            if (route.endsWith('/') && url.startsWith(route)) return true;
            if (route === '/navigation-editor' && url.startsWith('/navigation-editor/'))
              return true;
            return false;
          });

          if (!isRegisteredRoute) {
            // Return 404 for unregistered routes
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>404 - Page Not Found</title>
                  <meta name="robots" content="noindex">
                </head>
                <body>
                  <h1>404 - Page Not Found</h1>
                  <p>The requested page does not exist.</p>
                  <a href="/">Return to Dashboard</a>
                </body>
              </html>
            `);
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5073,
    allowedHosts: ['virtualpytest.com', 'www.virtualpytest.com', 'localhost', '127.0.0.1'],
    https: shouldUseHttps
      ? hasCertificates
        ? {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          }
        : undefined // Let Vite generate self-signed certificates
      : undefined, // No HTTPS
    // Configure how the dev server handles routing
    fs: {
      strict: false,
    },
  },
  // Configure build for proper SPA handling
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
