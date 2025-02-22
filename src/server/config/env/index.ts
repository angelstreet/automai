const dotenv = require('dotenv');
const path = require('path');

// Load environment-specific configuration
const loadEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const envPath = path.resolve(__dirname, `.env.${env}`);

  // Load environment variables from the appropriate file
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error(`Error loading environment configuration for ${env}:`, result.error);
    process.exit(1);
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
  }

  console.log(`Loaded ${env} environment configuration`);

  return {
    port: parseInt(process.env.PORT || '5001', 10),
    nodeEnv: process.env.NODE_ENV,
    database: {
      url: process.env.DATABASE_URL,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
    },
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: process.env.GITHUB_CALLBACK_URL,
      },
    },
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL,
    },
  };
};

module.exports = loadEnvConfig; 