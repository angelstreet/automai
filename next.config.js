const createNextIntlPlugin = require('next-intl/plugin');

// No need to manually load env files - Next.js handles this automatically
// when .env files are in the root directory

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
};

// Set NEXTAUTH_SECRET if not present
if (process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET;
}

module.exports = withNextIntl(nextConfig); 