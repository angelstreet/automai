'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { isFeatureEnabled, canCreateMore, getPlanFeatures } from '@/lib/features';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { debounce } from '@/lib/utils';

// Import as a function to ensure it's only called in client context
import getSupabaseAuth from '@/lib/supabase-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// Define a type for the auth client returned by getSupabaseAuth
type SupabaseAuthClient = ReturnType<typeof getSupabaseAuth>;

type PlanType = keyof typeof getPlanFeatures;

type User = AuthUser & {
  plan: PlanType;
};

type UserContextType = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isFeatureEnabled: (feature: string) => boolean;
  canCreateMore: (
    feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
    currentCount: number,
  ) => boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>; // Will use current session user
  checkSession: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  // Authentication methods
  getSession: () => Promise<{ data: { session: Session | null }, error: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ data: any, error: any }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ data: any, error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any, error: any }>;
  resetPassword: (email: string) => Promise<{ data: any, error: any }>;
};

// Cache for session data
const SESSION_CACHE_KEY = 'user_session_cache';
const SESSION_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Initialize state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();
  const pathname = usePathname();

  // Initialize refs to track state between renders
  const isFetchingUser = useRef(false);
  const lastFetchedAt = useRef(0);
  const authInitialized = useRef(false);
  
  // Try to get supabase client, with better error handling
  const supabaseAuthRef = useRef<SupabaseAuthClient>(null);
  
  try {
    if (!supabaseAuthRef.current) {
      console.log("UserContext - Attempting to initialize Supabase client");
      try {
        supabaseAuthRef.current = getSupabaseAuth();
        // Log available methods for debugging
        console.log("UserContext - Supabase auth methods initialized");
      } catch (initError) {
        console.error("UserContext - Error initializing Supabase client:", initError);
        // Try again with a delay
        setTimeout(() => {
          try {
            supabaseAuthRef.current = getSupabaseAuth();
            console.log("UserContext - Retry successful, Supabase client initialized");
          } catch (retryError) {
            console.error("UserContext - Retry failed:", retryError);
          }
        }, 1000);
      }
    }
  } catch (e) {
    console.error("Error initializing Supabase client:", e);
    setError("Failed to initialize authentication client");
  }
  
  // Get supabase client safely
  const supabaseAuth = supabaseAuthRef.current;
  
  // Load session on initial mount - simplified
  useEffect(() => {
    // Skip if already initialized or no supabaseAuth
    if (!supabaseAuth || authInitialized.current) return;
    
    authInitialized.current = true;
    console.log('UserContext - Initial session load');
    
    // Load session immediately
    loadSession();

    // Set up auth state change listener
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (supabaseAuth && typeof supabaseAuth.onAuthStateChange === 'function') {
      try {
        const {
          data: { subscription: authSubscription },
        } = supabaseAuth.onAuthStateChange((event: string, session: Session | null) => {
          console.log('UserContext - Auth state change:', event, {
            hasSession: !!session,
            user: session?.user ? `${session.user.email || 'no-email'}` : 'no-user'
          });

          // Load session on auth state changes
          loadSession();
        });

        subscription = authSubscription;
      } catch (err) {
        console.error('UserContext - Error setting up auth state change listener:', err);
        // Still try to load session if listener fails
        loadSession();
      }
    } else {
      // No listener available, use polling as fallback
      const intervalId = setInterval(() => {
        if (lastFetchedAt.current && Date.now() - lastFetchedAt.current < 30000) {
          return; // Don't check more than once every 30 seconds
        }
        loadSession();
      }, 30000);
      
      // Store interval ID for cleanup
      return () => clearInterval(intervalId);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabaseAuth]);

  // Track the last time we checked the session to avoid frequent checks
  const lastFocusCheckRef = useRef(Date.now());

  // Helper function to safely call supabaseAuth methods
  const safeAuthCall = async <T,>(
    methodName: string,
    method: (() => Promise<T>) | undefined,
    fallback: T
  ): Promise<T> => {
    if (!supabaseAuth) {
      console.error(`UserContext - Cannot call ${methodName}: Supabase auth client is not initialized`);
      return fallback;
    }
    
    if (typeof method !== 'function') {
      console.error(`UserContext - Cannot call ${methodName}: Method is not a function`);
      return fallback;
    }
    
    try {
      return await method();
    } catch (error) {
      console.error(`UserContext - Error calling ${methodName}:`, error);
      return fallback;
    }
  };

  const loadSession = useCallback(async () => {
    // Skip if already loading
    if (isFetchingUser.current) {
      console.log('UserContext - Session check already in progress, skipping');
      return;
    }
  
    // Skip if supabaseAuth is not initialized yet
    if (!supabaseAuth) {
      console.error('UserContext - Supabase auth client is not initialized');
      setError('Authentication client not initialized');
      setIsLoading(false);
      return;
    }
  
    // Check if we have fresh data (less than 30 seconds old)
    const now = Date.now();
    if (user && lastFetchedAt.current && now - lastFetchedAt.current < 30 * 1000) {
      console.log('UserContext - User data is fresh, skipping session check');
      setIsLoading(false);
      return;
    }
    
    // If we already have a user and the data is not too stale (less than 5 minutes old),
    // don't show loading state to avoid UI flicker
    const shouldShowLoading = !user || !lastFetchedAt.current || now - lastFetchedAt.current > 5 * 60 * 1000;
    
    if (shouldShowLoading) {
      setIsLoading(true);
    }
    
    console.log('UserContext - Loading session from Supabase');
    isFetchingUser.current = true;
  
    try {
      // Check for fallback auth mechanisms first
      let fallbackUserId = null;
      let fallbackAuthFound = false;
      let isGoogleAuth = false;
      
      // Check for Google-specific auth indicators
      try {
        // Check localStorage for Google auth
        if (typeof localStorage !== 'undefined') {
          const sbProvider = localStorage.getItem('sb-provider');
          const sbUserId = localStorage.getItem('sb-user-id');
          const sbAccessToken = localStorage.getItem('sb-access-token');
          
          if (sbProvider === 'google' && sbUserId && sbAccessToken) {
            console.log('UserContext - Found Google auth in localStorage');
            fallbackUserId = sbUserId;
            fallbackAuthFound = true;
            isGoogleAuth = true;
            
            // Try to set the session from localStorage
            if (supabaseAuth && typeof supabaseAuth.auth.setSession === 'function') {
              try {
                const refreshToken = localStorage.getItem('sb-refresh-token') || '';
                await supabaseAuth.auth.setSession({
                  access_token: sbAccessToken,
                  refresh_token: refreshToken,
                });
                console.log('UserContext - Set session from Google localStorage tokens');
              } catch (e) {
                console.error('UserContext - Error setting session from localStorage:', e);
              }
            }
          }
        }
        
        // Check cookies for Google auth
        const cookies = document.cookie.split(';').map(c => c.trim());
        const authProviderCookie = cookies.find(c => c.startsWith('auth-provider='));
        const googleUserIdCookie = cookies.find(c => c.startsWith('google-user-id='));
        
        if (authProviderCookie?.includes('google') && googleUserIdCookie) {
          console.log('UserContext - Found Google auth cookies');
          const googleUserId = googleUserIdCookie.split('=')[1];
          
          if (!fallbackUserId) {
            fallbackUserId = googleUserId;
            fallbackAuthFound = true;
            isGoogleAuth = true;
          }
        }
      } catch (e) {
        console.error('UserContext - Error checking for Google auth:', e);
      }
      
      // Check for session info in sessionStorage (from auth-redirect)
      try {
        const authRedirectTimestamp = sessionStorage.getItem('auth_redirect_timestamp');
        const authUserId = sessionStorage.getItem('auth_user_id');
        
        if (authRedirectTimestamp && authUserId) {
          const timestamp = parseInt(authRedirectTimestamp, 10);
          
          // If the auth redirect happened in the last 5 minutes, use this info
          if (now - timestamp < 5 * 60 * 1000) {
            console.log('UserContext - Found recent auth redirect info in sessionStorage');
            
            if (!fallbackUserId) {
              fallbackUserId = authUserId;
              fallbackAuthFound = true;
            }
          }
        }
      } catch (e) {
        console.error('UserContext - Error checking sessionStorage:', e);
      }
      
      // Check for user-session cookie
      try {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const userSessionCookie = cookies.find(c => c.startsWith('user-session='));
        const sessionActiveCookie = cookies.find(c => c.startsWith('session-active='));
        
        if (userSessionCookie && sessionActiveCookie) {
          const userId = userSessionCookie.split('=')[1];
          console.log('UserContext - Found user-session cookie:', userId);
          
          if (!fallbackUserId) {
            fallbackUserId = userId;
            fallbackAuthFound = true;
          }
        }
      } catch (e) {
        console.error('UserContext - Error checking cookies:', e);
      }
      
      // If we already have a user and found fallback auth that matches, skip the Supabase call
      // This helps avoid unnecessary API calls when switching between windows
      if (user && user.id === fallbackUserId && fallbackAuthFound) {
        console.log('UserContext - Using existing user with matching fallback auth, skipping Supabase call');
        setIsLoading(false);
        isFetchingUser.current = false;
        lastFetchedAt.current = now;
        return;
      }
      
      // Single call to get session
      const { data, error } = await safeAuthCall(
        'getSession',
        () => supabaseAuth.getSession(),
        { data: { session: null }, error: new Error('Failed to get session') }
      );
      
      if (error) {
        console.error('UserContext - Session error:', error);
        
        // If we have fallback auth, create a minimal user object
        if (fallbackAuthFound && fallbackUserId) {
          console.log('UserContext - Using fallback auth with userId:', fallbackUserId);
          
          const fallbackUser = {
            id: fallbackUserId,
            email: sessionStorage.getItem('auth_user_email') || undefined,
            plan: 'free' as PlanType,
            // Add minimal required properties to satisfy the User type
            app_metadata: { provider: isGoogleAuth ? 'google' : undefined },
            user_metadata: { plan: 'free' },
            aud: 'authenticated',
            created_at: '',
          } as User;
          
          setUser(fallbackUser);
          setSessionStatus('authenticated');
          setError(null);
          setIsLoading(false);
          isFetchingUser.current = false;
          lastFetchedAt.current = now;
          return;
        }
        
        setError(error.message);
        setUser(null);
        setSessionStatus('unauthenticated');
        setIsLoading(false);
        isFetchingUser.current = false;
        return;
      }

      if (data?.session) {
        // Session exists - authenticated
        console.log('UserContext - Session found:', {
          userId: data.session.user.id,
          email: data.session.user.email
        });
        
        setSession(data.session);
        setSessionStatus('authenticated');
        
        // Create or update user object from session
        const userFromSession = {
          ...data.session.user,
          plan: data.session.user.user_metadata?.plan || 'free' as PlanType
        };
        
        // Update user state with data from session
        setUser(userFromSession as User);
        
        // Mark as fetched now
        lastFetchedAt.current = Date.now();
      } else {
        // No session - unauthenticated
        console.log('UserContext - No session found');
        setUser(null);
        setSession(null);
        setSessionStatus('unauthenticated');
      }
    } catch (err: any) {
      console.error('UserContext - Error loading session:', err);
      setError(err.message);
      setUser(null);
      setSessionStatus('unauthenticated');
    } finally {
      setIsLoading(false);
      isFetchingUser.current = false;
    }
  }, [supabaseAuth, user, setError, setIsLoading, setUser, setSession, setSessionStatus]);

  // We don't need a separate fetch user function anymore
  // All user data comes directly from the session
  
  // This is a simplified version that can be used if needed
  async function refreshUser() {
    // Skip if already loading
    if (isFetchingUser.current) {
      console.log('UserContext - Refresh already in progress, skipping');
      return;
    }
    
    // Skip if supabaseAuth is not initialized yet
    if (!supabaseAuth) {
      console.error('UserContext - Cannot refresh user: Supabase auth client is not initialized');
      return;
    }
    
    // Implement debouncing to prevent multiple rapid refreshes
    const now = Date.now();
    if (lastFetchedAt.current && now - lastFetchedAt.current < 2000) {
      console.log('UserContext - Refresh requested too soon after last fetch, debouncing');
      return;
    }
    
    console.log('UserContext - Refreshing user data');
    isFetchingUser.current = true;
    
    try {
      // Don't show loading state for quick refreshes to avoid UI flicker
      const { data, error } = await safeAuthCall(
        'getSession',
        () => supabaseAuth.getSession(),
        { data: { session: null }, error: new Error('Failed to get session') }
      );
      
      if (error) {
        console.error('UserContext - Error refreshing user:', error);
        // Don't clear user on refresh errors to avoid disrupting the UI
        isFetchingUser.current = false;
        return;
      }
      
      if (data?.session) {
        // Session exists - authenticated
        setSession(data.session);
        setSessionStatus('authenticated');
        
        // Create or update user object from session
        const userFromSession = {
          ...data.session.user,
          plan: data.session.user.user_metadata?.plan || 'free' as PlanType
        };
        
        setUser(userFromSession);
        setError(null);
      } else {
        // No session - not authenticated
        // On explicit refresh, we should clear the user if no session is found
        setUser(null);
        setSession(null);
        setSessionStatus('unauthenticated');
      }
    } catch (e) {
      console.error('UserContext - Unexpected error refreshing user:', e);
    } finally {
      isFetchingUser.current = false;
      lastFetchedAt.current = now;
    }
  }

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      try {
        console.log('Updating user profile...');
        const response = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(data),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
        }

        // Refresh user data after successful update
        if (session.user) {
          // Use loadSession instead of fetchUser
          await loadSession();
          console.log('Profile updated successfully');
        } else {
          console.error('Cannot refresh user: session.user is undefined');
        }
      } catch (err) {
        console.error('Error updating profile:', err);
        throw err;
      }
    },
    [session],
  );

  // Reference to timeout for fetch debouncing
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check session only when needed with debounce
  const checkSession = useCallback(() => {
    const now = Date.now();
    if (!lastFetchedAt.current || now - lastFetchedAt.current > SESSION_CACHE_EXPIRY) {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Debounce the fetch call to prevent multiple rapid calls
      fetchTimeoutRef.current = setTimeout(() => {
        loadSession();
        fetchTimeoutRef.current = null;
      }, 300);
    }
  }, [loadSession]);

  // No window focus event listener to reduce complexity

  // Track number of fetch attempts for retries
  const fetchAttempts = useRef(0);
  
  // Add automatic retry with backoff if there's an error loading user data
  useEffect(() => {
    // Only attempt recovery if:
    // 1. We have an error
    // 2. We have a valid session
    // 3. We're not already loading
    // 4. We don't already have user data
    if (error && session && !isLoading && !user) {
      console.log('UserContext - Detected error state, scheduling recovery attempt');

      const retryTimeout = setTimeout(() => {
        console.log('UserContext - Attempting recovery load session');
        // Reset fetch attempts counter to give it a fresh start
        fetchAttempts.current = 0;
        // Load session directly
        loadSession();
      }, 2000); // 2 second delay before retry

      return () => clearTimeout(retryTimeout);
    }
  }, [error, session, isLoading, user]);

  // Expose session state to parent components via a custom event
  // This allows Server Components to potentially react to auth state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Dispatch a custom event with the authentication state
      // This is useful for server components to detect auth state changes
      const authState = {
        isAuthenticated: !!user,
        isLoading,
        hasError: !!error,
      };

      const event = new CustomEvent('authStateChange', {
        detail: authState,
        bubbles: true,
      });

      window.dispatchEvent(event);

      // Also store minimal auth state in localStorage for potential SSR hydration hints
      try {
        localStorage.setItem(
          'auth_state',
          JSON.stringify({
            isAuthenticated: !!user,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        console.warn('Failed to store auth state in localStorage:', e);
      }
    }
  }, [user, isLoading, error]);

  useEffect(() => {
    if (sessionStatus === 'loading') {
      console.log('UserContext - Session is loading');
      setIsLoading(true);
      return;
    }

    if (sessionStatus === 'authenticated' && session?.user) {
      console.log('UserContext - Session authenticated:', {
        status: 'authenticated',
        userId: session.user.id,
        email: session.user.email,
        accessToken: session.access_token
          ? `${session.access_token.substring(0, 15)}...`
          : 'missing',
        expires: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown',
        path: typeof window !== 'undefined' ? window.location.pathname : 'server-side',
        currentUser: user ? `${user.id.substring(0, 8)}...` : 'not loaded yet',
      });

      // If we already have a user and no error, we might not need to fetch again
      if (user && !error) {
        console.log('UserContext - Already have user data, skipping fetch');
        setIsLoading(false);

        // Check if the user data is reasonably fresh (less than 5 minutes old)
        const now = Date.now();
        if (lastFetchedAt.current && now - lastFetchedAt.current < SESSION_CACHE_EXPIRY) {
          console.log('UserContext - User data is fresh, no need to refetch');
          return;
        }
      }

      // Check if we're already fetching
      if (isFetchingUser.current) {
        console.log('UserContext - Already fetching user data, skipping duplicate fetch');
        return;
      }

      // Debounce the initial fetch
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      console.log('UserContext - Scheduling session refresh with delay');
      fetchTimeoutRef.current = setTimeout(() => {
        console.log('UserContext - Executing session refresh');
        loadSession();
        fetchTimeoutRef.current = null;
      }, 3000); // Increased delay to 3 seconds to reduce frequency of calls
    } else if (sessionStatus === 'unauthenticated') {
      console.log('UserContext - Session unauthenticated:', {
        status: 'unauthenticated',
        path: typeof window !== 'undefined' ? window.location.pathname : 'server-side',
      });
      setUser(null);
      setSessionStatus('unauthenticated');
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_CACHE_KEY);
      }
    }

    // Cleanup timeouts on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [sessionStatus, session, user, error]);

  const checkFeature = (feature: string): boolean => {
    if (!user) return false;
    return isFeatureEnabled(user.plan as PlanType, feature as keyof typeof getPlanFeatures);
  };

  const checkCanCreateMore = (
    feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
    currentCount: number,
  ): boolean => {
    if (!user) return false;
    return canCreateMore(user.plan as PlanType, feature, currentCount);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }

    // Sign out from Supabase
    await safeAuthCall(
      'signOut',
      supabaseAuth ? () => supabaseAuth.signOut() : undefined,
      { error: null }
    );

    setUser(null);
    setSession(null);
    setSessionStatus('unauthenticated');
  };

  // We've already updated the refreshUser function earlier
  // This is just to fix the missing reference in the code

  // Authentication methods that call through to supabaseAuth
  const getSession = useCallback(async () => {
    return safeAuthCall(
      'getSession',
      supabaseAuth ? () => supabaseAuth.getSession() : undefined,
      { data: { session: null }, error: new Error('Failed to get session') }
    );
  }, [supabaseAuth]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    return safeAuthCall(
      'signInWithPassword',
      supabaseAuth ? () => supabaseAuth.signInWithPassword(email, password) : undefined,
      { data: null, error: new Error('Authentication client not initialized') }
    );
  }, [supabaseAuth]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    return safeAuthCall(
      'signInWithOAuth',
      supabaseAuth ? () => supabaseAuth.signInWithOAuth(provider) : undefined,
      { data: null, error: new Error('Authentication client not initialized') }
    );
  }, [supabaseAuth]);

  const signUp = useCallback(async (email: string, password: string) => {
    return safeAuthCall(
      'signUp',
      supabaseAuth ? () => supabaseAuth.signUp(email, password) : undefined,
      { data: null, error: new Error('Authentication client not initialized') }
    );
  }, [supabaseAuth]);

  const resetPassword = useCallback(async (email: string) => {
    return safeAuthCall(
      'resetPassword',
      supabaseAuth ? () => supabaseAuth.resetPassword(email) : undefined,
      { data: null, error: new Error('Authentication client not initialized') }
    );
  }, [supabaseAuth]);

  const value = {
    user,
    isLoading: isLoading || sessionStatus === 'loading',
    error,
    isFeatureEnabled: checkFeature,
    canCreateMore: checkCanCreateMore,
    logout,
    refreshUser,
    checkSession,
    updateProfile,
    // Auth methods
    getSession,
    signInWithPassword,
    signInWithOAuth,
    signUp,
    resetPassword,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
