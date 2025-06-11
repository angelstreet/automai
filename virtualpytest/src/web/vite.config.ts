import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5073,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.VITE_SERVER_PORT || '5109'}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[@vite:proxy] API Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[@vite:proxy] API Sending request to target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[@vite:proxy] API Received response from target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/server': {
        target: `http://127.0.0.1:${process.env.VITE_SERVER_PORT || '5109'}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[@vite:proxy] Server Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[@vite:proxy] Server Sending request to target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[@vite:proxy] Server Received response from target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/host': {
        target: `http://127.0.0.1:${process.env.VITE_HOST_PORT || '6019'}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[@vite:proxy] Host Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[@vite:proxy] Host Sending request to target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[@vite:proxy] Host Received response from target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
});