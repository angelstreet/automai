import fs from 'fs';
import os from 'os';
import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Auto-detect HTTPS based on server URL environment variable
const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:5109';
const shouldUseHttps = serverUrl.startsWith('https://');

// Helper function to resolve tilde paths
function resolvePath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

// Certificate paths with multiple fallback options
const certPaths = [
  // User's home directory (for development)
  {
    cert: resolvePath('~/vite-certs/fullchain.pem'),
    key: resolvePath('~/vite-certs/privkey.pem'),
  },
  // Let's Encrypt paths (for production)
  {
    cert: '/etc/letsencrypt/live/virtualpytest.com/fullchain.pem',
    key: '/etc/letsencrypt/live/virtualpytest.com/privkey.pem',
  },
];

// Function to check if certificates are readable
function canReadCertificates(certPath: string, keyPath: string): boolean {
  try {
    fs.accessSync(certPath, fs.constants.R_OK);
    fs.accessSync(keyPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// Find the first available certificate pair
let httpsConfig: { key: Buffer; cert: Buffer } | undefined;
let certificateSource = 'none';

if (shouldUseHttps) {
  for (const { cert, key } of certPaths) {
    if (fs.existsSync(cert) && fs.existsSync(key) && canReadCertificates(cert, key)) {
      try {
        httpsConfig = {
          key: fs.readFileSync(key),
          cert: fs.readFileSync(cert),
        };
        certificateSource = cert.includes('letsencrypt') ? 'letsencrypt' : 'local';
        console.log(`[vite] Using ${certificateSource} certificates: ${cert}`);
        break;
      } catch (error) {
        console.warn(`[vite] Failed to read certificates from ${cert}:`, error);
      }
    }
  }

  if (!httpsConfig) {
    console.log('[vite] No valid certificates found, using Vite self-signed certificates');
    certificateSource = 'self-signed';
  }
}

// Define registered frontend routes (must match your React Router routes)
const registeredRoutes = [
  '/',
  '/test-plan/test-cases',
  '/test-plan/campaigns',
  '/test-plan/collections',
  '/test-execution/run-tests',
  '/test-execution/monitoring',
  '/test-results/reports',
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
    https: shouldUseHttps ? (httpsConfig ? httpsConfig : true) : undefined,
    // Configure HMR for WebSocket connections
    hmr: shouldUseHttps
      ? {
          port: 5073,
          host: 'localhost',
          protocol: 'wss',
        }
      : {
          port: 5073,
          host: 'localhost',
        },
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
