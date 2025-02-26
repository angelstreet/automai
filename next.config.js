const withNextIntl = require('next-intl/plugin')();
const { loadEnvConfig } = require('./src/lib/env');

// Load environment variables
loadEnvConfig();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add any other Next.js config options here
  
  // Ignore optional dependencies that cause warnings
  webpack: (config, { isServer }) => {
    // Ignore optional modules that cause warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'cpu-features': false,
    };
    
    // Ignore specific module not found warnings
    config.ignoreWarnings = [
      { module: /node_modules\/ssh2\/lib\/protocol\/constants\.js/ },
      { module: /node_modules\/ssh2\/lib\/protocol\/crypto\.js/ }
    ];
    
    return config;
  },
  
  // Configure server options for WebSocket support
  experimental: {
    serverComponentsExternalPackages: ['ws', 'ssh2'],
  },
};

module.exports = withNextIntl(nextConfig); 