declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test' | 'codespace';
      ENV_FILE?: string;
      CODESPACE?: string;
      HOST?: string;
      PORT?: string;
      // Database connections
      DATABASE_URL?: string;
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
      // Auth
      JWT_SECRET?: string;
      NEXT_PUBLIC_SITE_URL?: string;
    }
  }
}

export {}; 