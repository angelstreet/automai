// Helper function to ensure session is persisted across different storage mechanisms
const ensureSessionPersistence = async (session: any, supabase: any) => {
  try {
    console.log('Setting session persistence...');
    
    // Set essential cookies for authentication
    const cookieOptions = 'path=/; max-age=604800; SameSite=Lax';
    
    // Store user ID in a cookie - this is our main fallback mechanism
    document.cookie = `user-session=${session.user.id}; ${cookieOptions}`;
    
    // Store auth provider in a cookie for provider-specific handling
    const provider = session.user.app_metadata?.provider || 'unknown';
    document.cookie = `auth-provider=${provider}; ${cookieOptions}`;
    
    // Store minimal non-sensitive data in localStorage for UI personalization
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('user-email', session.user.email || '');
        localStorage.setItem('user-name', session.user.user_metadata?.name || '');
      }
    } catch (e) {
      console.error('Error storing user data in localStorage:', e);
    }
    
    // Explicitly set the session for Supabase
    try {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
      });
      console.log('Session explicitly set in Supabase');
    } catch (e) {
      console.error('Error setting session:', e);
    }
    
    console.log('Session persistence complete');
    return true;
  } catch (e) {
    console.error('Error in session persistence:', e);
    return false;
  }
}; 