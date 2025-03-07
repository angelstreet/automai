'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { isFeatureEnabled, canCreateMore, getPlanFeatures } from '@/lib/features';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { debounce } from '@/lib/utils';

// Import the client-side Supabase utilities
import { createClient } from '@/utils/supabase/client';
import type { SupabaseClient, AuthError } from '@supabase/supabase-js';
import { PlanType } from '@/lib/features';

// Define auth client type
type SupabaseAuthClient = SupabaseClient;

type User = AuthUser & {
  plan: PlanType;
  tenant_name?: string | null;
  tenant_id?: string | null;
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

  // Initialize refs to track state between renders
  const isFetchingUser = useRef(false);
  const lastFetchedAt = useRef(0);
  const authInitialized = useRef(false);
  
  // Initialize supabase client
  const supabaseAuthRef = useRef<SupabaseAuthClient | null>(null);
  
  // Initialize client on demand
  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      console.error("UserContext - Attempted to get Supabase client in server context");
      return null;
    }
    
    try {
      // Create client on first use
      if (!supabaseAuthRef.current) {
        console.log("UserContext - Initializing Supabase client");
        // Wrap client creation in try/catch to handle potential errors
        try {
          supabaseAuthRef.current = createClient();
          console.log("UserContext - Supabase client initialized successfully");
        } catch (initError) {
          console.error("UserContext - Failed to initialize Supabase client:", initError);
          setError("Failed to initialize authentication client");
          return null;
        }
      }
      return supabaseAuthRef.current;
    } catch (e) {
      console.error("UserContext - Error accessing Supabase client:", e);
      setError("Failed to access authentication client");
      return null;
    }
  }, []);
  
  // Safe auth call wrapper
  const safeAuthCall = async <T,>(
    methodName: string,
    methodFn: (client: SupabaseAuthClient) => Promise<T>,
    fallback: T
  ): Promise<T> => {
    try {
      const supabase = createClient();
      return await methodFn(supabase);
    } catch (error) {
      console.error(`Error in ${methodName}:`, error);
      return fallback;
    }
  };

  // Create a ref to store previous auth state
  const prevAuthStateRef = useRef<{
    isAuthenticated: boolean;
    isLoading: boolean;
    hasError: boolean;
  } | null>(null);

  // Track if we've dispatched the initial auth state
  const initialAuthStateDispatched = useRef(false);

  // Define loadSession function
  const loadSession = useCallback(async () => {
    try {
      console.log('UserContext - Loading session');
      
      // Don't set loading state if we're just initializing
      if (!initialAuthStateDispatched.current) {
        setIsLoading(true);
      }
      
      isFetchingUser.current = true;

      // No cached session, fetch from Supabase
      const { data, error } = await safeAuthCall(
        'getSession',
        (client) => client.auth.getSession(),
        { data: { session: null }, error: null }
      );

      if (error) {
        console.error('UserContext - Error loading session:', error);
        setError('Failed to load user session');
        setUser(null);
        setSessionStatus('unauthenticated');
        return;
      }

      if (data?.session) {
        // Session exists - authenticated
        console.log('UserContext - Valid session found:', {
          email: data.session.user.email,
          userId: data.session.user.id
        });
        
        setSession(data.session);
        setSessionStatus('authenticated');

        // Create or update user object from session
        const userFromSession = {
          ...data.session.user,
          plan: (data.session.user.user_metadata?.plan || 'TRIAL') as PlanType,
          tenant_id: data.session.user.user_metadata?.tenant_id || data.session.user.user_metadata?.tenantId || 'trial',
          tenant_name: data.session.user.user_metadata?.tenant_name || data.session.user.user_metadata?.tenantName || 'trial'
        };
        
        setUser(userFromSession as User);
        setError(null);
      } else {
        // No session - not authenticated
        console.log('UserContext - No session found');
        setUser(null);
        setSessionStatus('unauthenticated');
      }
    } catch (e) {
      console.error('UserContext - Unexpected error loading session:', e);
      setError('Unexpected error loading user session');
      setUser(null);
      setSessionStatus('unauthenticated');
    } finally {
      isFetchingUser.current = false;
      setIsLoading(false);
      lastFetchedAt.current = Date.now();
    }
  }, [safeAuthCall]);

  // Track the last time we checked the session to avoid frequent checks
  const lastFocusCheckRef = useRef(Date.now());

  // We don't need a separate fetch user function anymore
  // All user data comes directly from the session
  
  // This is a simplified version that can be used if needed
  async function refreshUser() {
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
        (client) => client.auth.getSession(),
        { data: { session: null }, error: null }
      );
      
      if (error) {
        console.error('UserContext - Error refreshing user:', error);
        // Don't clear user on refresh errors to avoid disrupting the UI
        isFetchingUser.current = false;
        setSessionStatus('unauthenticated');
        setIsLoading(false);
        return;
      }
      
      if (data?.session) {
        // Session exists - authenticated
        setSession(data.session);
        setSessionStatus('authenticated');
        
        // Create or update user object from session
        const userFromSession = {
          ...data.session.user,
          plan: (data.session.user.user_metadata?.plan || 'TRIAL') as PlanType,
          tenant_id: data.session.user.user_metadata?.tenant_id || data.session.user.user_metadata?.tenantId || 'trial',
          tenant_name: data.session.user.user_metadata?.tenant_name || data.session.user.user_metadata?.tenantName || 'trial'
        };
        
        // Fetch user profile from API to get the most up-to-date data
        try {
          const profileResponse = await fetch('/api/auth/profile');
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            // Update user with profile data
            const updatedUser: User = {
              ...userFromSession,
              tenant_id: profileData.tenant_id || userFromSession.tenant_id,
              tenant_name: profileData.tenant_name || userFromSession.tenant_name,
              plan: (profileData.plan || userFromSession.plan) as PlanType
            };
            setUser(updatedUser);
          } else {
            setUser(userFromSession as User);
          }
        } catch (profileError) {
          console.error('UserContext - Error fetching profile:', profileError);
          setUser(userFromSession as User);
        }
        
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
      setSessionStatus('unauthenticated');
    } finally {
      isFetchingUser.current = false;
      lastFetchedAt.current = now;
      setIsLoading(false);
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      const { data: sessionData } = await getSession();
      if (!sessionData?.session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Refresh user data
      await refreshUser();
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

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

  // Effect to load session on mount - only run once
  useEffect(() => {
    // Only run on initial mount, not on every sessionStatus change
    if (!authInitialized.current) {
      authInitialized.current = true;
      loadSession();
    }
  }, [loadSession]);

  // Expose session state to parent components via a custom event
  // This allows Server Components to potentially react to auth state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Only dispatch event if the state has actually changed
      const authState = {
        isAuthenticated: !!user,
        isLoading,
        hasError: !!error,
      };

      // Only dispatch if state has changed or it's the first time
      if (!initialAuthStateDispatched.current || 
          !prevAuthStateRef.current ||
          prevAuthStateRef.current.isAuthenticated !== authState.isAuthenticated ||
          prevAuthStateRef.current.isLoading !== authState.isLoading ||
          prevAuthStateRef.current.hasError !== authState.hasError) {
        
        // Mark that we've dispatched the initial state
        initialAuthStateDispatched.current = true;
        prevAuthStateRef.current = authState;
        
        console.log('UserContext - Dispatching auth state change:', authState);
        
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
    }
  }, [user, isLoading, error]);

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
      (client) => client.auth.signOut(),
      { error: null }
    );

    setUser(null);
    setSession(null);
    setSessionStatus('unauthenticated');
  };

  // We've already updated the refreshUser function earlier
  // This is just to fix the missing reference in the code

  // Authentication methods using the new Supabase client
  const getSession = useCallback(async () => {
    return safeAuthCall(
      'getSession',
      (client) => client.auth.getSession(),
      { data: { session: null }, error: null }
    );
  }, [safeAuthCall]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    return safeAuthCall(
      'signInWithPassword',
      (client) => client.auth.signInWithPassword({ email, password }),
      { data: null, error: null } as any
    );
  }, [safeAuthCall]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    // Get current locale for redirect
    let locale = 'en';
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && ['en', 'fr'].includes(pathParts[0])) {
        locale = pathParts[0];
      }
    }
    
    // Always use the current window's origin for redirects
    const origin = typeof window !== 'undefined' ? window.location.origin : 
      (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    
    const redirectUrl = `${origin}/${locale}/auth-redirect`;
    
    console.log(`[UserContext] Initiating OAuth sign-in with ${provider}`);
    console.log(`[UserContext] Using redirect URL: ${redirectUrl}`);
    console.log(`[UserContext] Current origin: ${origin}`);
    
    // Always use Supabase for OAuth flow to ensure proper handling of callbacks
    return safeAuthCall(
      'signInWithOAuth',
      (client) => client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          scopes: provider === 'github' ? 'repo,user' : 'email profile',
          // Use PKCE flow for better security
          flowType: 'pkce'
        }
      }),
      { data: null, error: null } as any
    );
  }, [safeAuthCall]);

  const signUp = useCallback(async (email: string, password: string) => {
    // Get current locale for redirect
    let locale = 'en';
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && ['en', 'fr'].includes(pathParts[0])) {
        locale = pathParts[0];
      }
    }
    
    const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/auth-redirect`;
    
    return safeAuthCall(
      'signUp',
      (client) => client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      }),
      { data: null, error: null } as any
    );
  }, [safeAuthCall]);

  const resetPassword = useCallback(async (email: string) => {
    // Get current locale for redirect
    let locale = 'en';
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && ['en', 'fr'].includes(pathParts[0])) {
        locale = pathParts[0];
      }
    }
    
    const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/reset-password`;
    
    return safeAuthCall(
      'resetPassword',
      (client) => client.auth.resetPasswordForEmail(email, { 
        redirectTo: redirectUrl
      }),
      { data: null, error: null } as any
    );
  }, [safeAuthCall]);

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
    console.warn(
      'useUser() hook was called outside of UserProvider context. ' +
      'Make sure your component is wrapped in the UserProvider.'
    );
    
    return {
      user: null,
      isLoading: false,
      error: 'UserProvider not found',
      isFeatureEnabled: () => false,
      canCreateMore: () => false,
      logout: async () => {},
      refreshUser: async () => {},
      checkSession: () => {},
      updateProfile: async () => {},
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: null }),
      signInWithOAuth: async () => ({ data: null, error: null }),
      signUp: async () => ({ data: null, error: null }),
      resetPassword: async () => ({ data: null, error: null }),
    };
  }
  
  return context;
}
