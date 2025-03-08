import { isProduction, isDevelopment } from '../env';

/**
 * Gets the Supabase URL with environment-appropriate fallbacks
 */
export const getSupabaseUrl = () => {
  if (isDevelopment()) {
    // Handle GitHub Codespaces environment
    if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
      const hostname = window.location.hostname;
      // Extract just the codespace project name without port numbers
      const hostnameBase = hostname.split('.')[0];
      
      // Find where the codespace ID ends and any port begins
      let codespacePart = hostnameBase;
      // Look for the last hyphen followed by just numbers (port indicator)
      const portMatch = hostnameBase.match(/(.*?)(-\d+)$/);
      if (portMatch && portMatch[1]) {
        codespacePart = portMatch[1]; // Just the base name without port
        console.log(`Detected Codespace base name: ${codespacePart} (removed port from ${hostnameBase})`);
      }
      
      // Always use the -54321 suffix for Supabase
      return `https://${codespacePart}-54321.app.github.dev`;
    }
    
    // Fallback for local development
    return process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  }
  
  // Production - require the environment variable
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
};

/**
 * Gets the Supabase anon key with environment-appropriate fallbacks
 */
export const getSupabaseAnonKey = () => {
  if (isDevelopment()) {
    return (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      // Default local development key
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    );
  }
  
  // Production - require the environment variable
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
};

/**
 * Gets the Supabase service role key
 */
export const getSupabaseServiceKey = () => {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
};

/**
 * Detects if running in GitHub Codespaces environment
 */
export const isCodespaceEnvironment = () => {
  return typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
};

/**
 * Validates that required Supabase environment variables are set
 * Throws an error if missing in production, warns in development
 */
export const validateSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (isProduction()) {
    if (!url || !key) {
      throw new Error('Missing required Supabase environment variables in production');
    }
  } else if (!url || !key) {
    console.warn('Using fallback Supabase credentials - set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for custom values');
  }
};