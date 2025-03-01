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
    nextAuth: {
      url: process.env.NEXTAUTH_URL,
      secret: process.env.NEXTAUTH_SECRET,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },

  api: {
    baseUrl: process.env.NEXTAUTH_URL,
  },
} as const;

export default config;
