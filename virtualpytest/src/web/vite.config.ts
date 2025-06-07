import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5073,
    proxy: {
      '/api': {
        target: `https://77.56.53.130:${process.env.VITE_SERVER_PORT || '5119'}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[@vite:proxy] Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[@vite:proxy] Sending request to target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[@vite:proxy] Received response from target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
});