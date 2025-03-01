import { env } from './env';

export const config = {
  server: {
    env: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  database: {
    url: env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },

  auth: {
    nextAuth: {
      url: env.NEXTAUTH_URL,
      secret: env.NEXTAUTH_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },

  api: {
    baseUrl: env.NEXTAUTH_URL,
  },
} as const;

export default config;
