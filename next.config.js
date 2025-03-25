const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  experimental: {
    allowedDevOrigins: [
      '*.cloudworkstations.dev', 
      '3000-idx-automaigit-1741768452810.cluster-4ezwrnmkojawstf2k7vqy36oe6.cloudworkstations.dev'
    ],
  },
  assetPrefix: process.env.ASSET_PREFIX || '',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
      bcrypt: 'commonjs bcrypt',
      '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
      'oidc-token-hash': 'commonjs oidc-token-hash',
    });
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      npm: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    };
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    config.ignoreWarnings = [
      { module: /node_modules\/ssh2\/lib\/protocol\/constants\.js/ },
      { module: /node_modules\/ssh2\/lib\/protocol\/crypto\.js/ },
      { module: /node_modules\/@mapbox\/node-pre-gyp/ },
      { module: /node_modules\/bcrypt/ },
      { module: /node_modules\/oidc-token-hash/ },
      { module: /node_modules\/openid-client/ },
      { message: /should not be imported directly/ },
    ];
    return config;
  },
  serverExternalPackages: [
    'ws',
    'ssh2',
    'bcrypt',
    '@mapbox/node-pre-gyp',
    'oidc-token-hash',
    'openid-client',
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withNextIntl(nextConfig);
