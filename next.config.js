const withNextIntl = require('next-intl/plugin')();
const { loadEnvConfig } = require('./src/lib/env');

// Load environment variables
loadEnvConfig();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add any other Next.js config options here
};

module.exports = withNextIntl(nextConfig); 