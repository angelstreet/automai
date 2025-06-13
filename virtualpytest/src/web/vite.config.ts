import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5073,
    allowedHosts: ['virtualpytest.com', 'www.virtualpytest.com', 'localhost', '127.0.0.1'],
  },
});
