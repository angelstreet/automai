const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
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
    ];
    return config;
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'localhost:3001', 
        'localhost:3002',
        `${process.env.CODESPACE_NAME}-3000.app.github.dev`
      ],
    },
  },
  serverExternalPackages: [
    'ws',
    'ssh2',
    'bcrypt',
    '@mapbox/node-pre-gyp',
    'oidc-token-hash',
    'openid-client',
  ],
  async headers() {
    return [
      {
        source: '/api/terminals/:id',
        headers: [
          { key: 'Connection', value: 'keep-alive' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

if (process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET;
}

module.exports = withNextIntl(nextConfig);
