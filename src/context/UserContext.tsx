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

  // Handle window focus events
  useEffect(() => {
    function handleFocus() {
      // Only refresh if data is stale (older than 5 minutes) and supabaseAuth is initialized
      if (supabaseAuth && (!lastFetchedAt.current || Date.now() - lastFetchedAt.current > 5 * 60 * 1000)) {
        console.log('UserContext - Window focus, checking session');
        loadSession();
      } else if (!supabaseAuth) {
        console.log('UserContext - Window focus, but supabaseAuth not initialized yet');
      } else {
        console.log('UserContext - Window focus, data is fresh, skipping check');
      }
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [supabaseAuth]);

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

  async function loadSession() {
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
    if (user && lastFetchedAt.current && Date.now() - lastFetchedAt.current < 30 * 1000) {
      console.log('UserContext - User data is fresh, skipping session check');
      setIsLoading(false);
      return;
    }
  
    console.log('UserContext - Loading session from Supabase');
    setIsLoading(true);
    isFetchingUser.current = true;
  
    try {
      // Single call to get session
      const { data, error } = await safeAuthCall(
        'getSession',
        () => supabaseAuth.getSession(),
        { data: { session: null }, error: new Error('Failed to get session') }
      );
      
      if (error) {
        console.error('UserContext - Session error:', error);
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
  }

  // We don't need a separate fetch user function anymore
  // All user data comes directly from the session
  
  // This is a simplified version that can be used if needed
  async function refreshUser() {
    if (!supabaseAuth) {
      console.error('Cannot refresh user: Supabase auth client is not initialized');
      return;
    }
    
    if (!session?.user) {
      console.error('Cannot refresh user: No active session');
      return;
    }
    
    // Just reload the session
    loadSession();
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
          await fetchUser(session.user);
          console.log('Profile updated successfully');
        } else {
          console.error('Cannot refresh user: session.user is undefined');
        }
      } catch (err) {
        console.error('Error updating profile:', err);
        throw err;
      }
    },
    [session, fetchUser],
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
        if (session?.user) {
          fetchUser(session.user);
        }
        fetchTimeoutRef.current = null;
      }, 300);
    }
  }, [session, fetchUser]);

  // Add a listener to refresh the session when the app regains focus
  useEffect(() => {
    function handleFocus() {
      console.log('Window focused, checking session');
      checkSession();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [checkSession]);

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
        console.log('UserContext - Attempting recovery fetch for user data');
        // Reset fetch attempts counter to give it a fresh start
        fetchAttempts.current = 0;
        if (session.user) {
          fetchUser(session.user);
        }
      }, 2000); // 2 second delay before retry

      return () => clearTimeout(retryTimeout);
    }
  }, [error, session, isLoading, user, fetchUser]);

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

      console.log('UserContext - Scheduling user profile fetch with delay');
      fetchTimeoutRef.current = setTimeout(() => {
        console.log('UserContext - Executing user profile fetch now');
        if (session?.user) {
          fetchUser(session.user);
        }
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
  }, [sessionStatus, session, fetchUser, user, error]);

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
