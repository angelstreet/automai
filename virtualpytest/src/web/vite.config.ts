import fs from 'fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Auto-detect HTTPS based on server URL environment variable
const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:5109';
const shouldUseHttps = serverUrl.startsWith('https://');

// Certificate paths (only used if HTTPS is needed)
const certPath = '/etc/letsencrypt/live/virtualpytest.com/fullchain.pem';
const keyPath = '/etc/letsencrypt/live/virtualpytest.com/privkey.pem';
const hasCertificates = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5073,
    allowedHosts: ['virtualpytest.com', 'www.virtualpytest.com', 'localhost', '127.0.0.1'],
    https: shouldUseHttps
      ? hasCertificates
        ? {
            key: keyPath,
            cert: certPath,
          }
        : true // Self-signed certificates
      : false, // No HTTPS
  },
});
