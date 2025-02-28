import { env } from './env';

export const config = {
  server: {
    port: env.PORT,
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
    jwt: {
      secret: env.JWT_SECRET,
    },
    nextAuth: {
      url: env.NEXTAUTH_URL,
      secret: env.NEXTAUTH_SECRET || env.JWT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackUrl: env.GITHUB_CALLBACK_URL,
    },
  },

  services: {
    elasticsearch: env.ELASTICSEARCH_URL,
  },

  api: {
    baseUrl: env.NEXTAUTH_URL,
  },
} as const;

export default config;
