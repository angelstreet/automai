import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5073,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_SERVER_PORT || '5119'}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});