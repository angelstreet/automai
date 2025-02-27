const createNextIntlPlugin = require('next-intl/plugin');
const { loadEnvConfig } = require('./src/lib/env');

// Load environment variables
loadEnvConfig();

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add any other Next.js config options here
  
  // Ignore optional dependencies that cause warnings
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
    };

    config.module = config.module || {};
    config.module.exprContextCritical = false;

    // Ignore specific module not found warnings
    config.ignoreWarnings = [
      { module: /node_modules\/ssh2\/lib\/protocol\/constants\.js/ },
      { module: /node_modules\/ssh2\/lib\/protocol\/crypto\.js/ }
    ];
    
    return config;
  },
  
  // Configure server options
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  
  // External packages that should not be bundled
  serverExternalPackages: ['ws', 'ssh2'],
  
  // Configure custom server settings
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/virtualization/machines/:id/terminal',
          destination: '/api/virtualization/machines/:id/terminal',
          has: [{ type: 'header', key: 'upgrade', value: 'websocket' }],
        },
      ],
    };
  },
};

module.exports = withNextIntl(nextConfig); 