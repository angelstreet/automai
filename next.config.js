const createNextIntlPlugin = require('next-intl/plugin');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// No need to manually load env files - Next.js handles this automatically
// when .env files are in the root directory

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove swcMinify as it's unrecognized in Next.js 15.2.0
  
  // Remove optimizeFonts as it's unrecognized in Next.js 15.2.0

  // Configure allowed image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    // Add image optimization settings
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Ignore optional dependencies that cause warnings
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

    // Ignore specific module not found warnings
    config.ignoreWarnings = [
      { module: /node_modules\/ssh2\/lib\/protocol\/constants\.js/ },
      { module: /node_modules\/ssh2\/lib\/protocol\/crypto\.js/ },
      { module: /node_modules\/@mapbox\/node-pre-gyp/ },
      { module: /node_modules\/bcrypt/ },
      { module: /node_modules\/oidc-token-hash/ },
      { module: /node_modules\/openid-client/ },
    ];

    // Add optimization configurations
    config.optimization = {
      ...config.optimization,
      // Improve tree-shaking
      usedExports: true,
      // Minimize output size
      minimize: true,
      // Reduce module concatenation bailouts
      concatenateModules: true,
      // Split chunks for better caching
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 20000,
        maxSize: 244000, // Add max size to prevent large chunks
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Fix the naming function to handle null cases
              if (!module.context) return 'vendor';
              
              const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              if (!match || !match[1]) return 'vendor';
              
              // Group packages by top-level module name to reduce chunk count
              const packageName = match[1];
              
              // Group common UI libraries together
              if (packageName.startsWith('@radix-ui')) {
                return 'npm.radix-ui';
              }
              
              if (packageName.includes('react') || packageName.includes('next')) {
                return 'npm.react-next-core';
              }
              
              // Return a readable name for better debugging
              return `npm.${packageName.replace('@', '')}`;
            },
            priority: 20,
          },
          // Add specific chunk for formatjs which appears large in the bundle
          formatjs: {
            test: /[\\/]node_modules[\\/](@formatjs|intl-|formatjs)/,
            name: 'npm.formatjs-intl',
            priority: 30, // Higher priority than vendor
          },
          // Add specific chunk for xterm which appears large in the bundle
          xterm: {
            test: /[\\/]node_modules[\\/](xterm|xterm-addon)/,
            name: 'npm.xterm',
            priority: 30, // Higher priority than vendor
          },
          // Add specific chunk for common utilities
          utils: {
            test: /[\\/]src[\\/](utils|lib|helpers)[\\/]/,
            name: 'app-utils',
            priority: 10,
          },
        },
      },
      // Add runtime chunk to improve caching
      runtimeChunk: {
        name: 'runtime',
      },
    };

    return config;
  },

  // Configure server options
  experimental: {
    // Add optimizations for server components
    serverComponentsExternalPackages: [
      'bcrypt',
      'ssh2',
      'node-ssh',
    ],
    // Add partial prerendering for better performance
    ppr: true,
    // Add other experimental features
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // External packages that should not be bundled
  serverExternalPackages: [
    'ws',
    'ssh2',
    'bcrypt',
    '@mapbox/node-pre-gyp',
    'oidc-token-hash',
    'openid-client',
  ],

  // Ensure WebSocket connections are handled properly
  async headers() {
    return [
      {
        source: '/api/terminals/:id',
        headers: [
          { key: 'Connection', value: 'keep-alive' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      // Add cache headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Add compiler options for better performance
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

// Set NEXTAUTH_SECRET if not present
if (process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET;
}

module.exports = withNextIntl(withBundleAnalyzer(nextConfig));
