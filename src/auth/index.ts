export {
    getSession,
    extractSessionFromHeader,
    getUser,
    isAuthenticated,
    signInWithPassword,
    signUp,
    signInWithOAuth,
    handleOAuthCallback,
    signOut,
    updatePassword,
    resetPasswordForEmail,
    updateProfile,
  } from '@/lib/supabase/auth';
  
  export type { UserSession, SessionData, AuthResult } from '@/lib/supabase/auth';