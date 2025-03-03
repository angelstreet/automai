declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test' | 'codespace';
      ENV_FILE?: string;
      CODESPACE?: string;
      HOST?: string;
      PORT?: string;
      // Add other environment variables
      DATABASE_URL?: string;
      NEXTAUTH_URL?: string;
      NEXTAUTH_SECRET?: string;
    }
  }
}

export {};