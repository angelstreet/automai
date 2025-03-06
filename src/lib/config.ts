export const config = {
  server: {
    env: process.env.NODE_ENV,
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },

  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },

  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
    },
  },

  api: {
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
} as const;

export default config;
