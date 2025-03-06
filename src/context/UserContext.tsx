'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { isFeatureEnabled, canCreateMore, getPlanFeatures } from '@/lib/features';
import supabaseAuth from '@/lib/supabase-auth';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { CustomSupabaseUser } from '@/types/auth';
import { createBrowserSupabase } from '@/lib/supabase';
import { debounce } from '@/lib/utils';

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
  refreshUser: () => Promise<void>;
  checkSession: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
};

// Cache for session data
const SESSION_CACHE_KEY = 'user_session_cache';
const SESSION_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // Add refs to track initialization and in-flight requests
  const isInitialized = useRef(false);
  const isFetchingUser = useRef(false);
  const lastFetchedAt = useRef<number | null>(null);

  // Load session on initial mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    console.log('UserContext - Initial session load');
    loadSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      (event, session) => {
        console.log('UserContext - Auth state change:', event);
        
        // Only process meaningful state changes
        if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
          loadSession();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle window focus events
  useEffect(() => {
    function handleFocus() {
      // Only refresh if data is stale (older than 5 minutes)
      if (!lastFetchedAt.current || (Date.now() - lastFetchedAt.current) > 5 * 60 * 1000) {
        console.log('UserContext - Window focus, checking session');
        loadSession();
      } else {
        console.log('UserContext - Window focus, data is fresh, skipping check');
      }
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  async function loadSession() {
    // Skip if already loading
    if (isFetchingUser.current) {
      console.log('UserContext - Session check already in progress, skipping');
      return;
    }
    
    // Check if we have fresh data (less than 5 minutes old)
    if (user && lastFetchedAt.current && (Date.now() - lastFetchedAt.current) < 5 * 60 * 1000) {
      console.log('UserContext - User data is fresh, skipping session check');
      return;
    }
    
    console.log('UserContext - Loading session from Supabase');
    setIsLoading(true);
    isFetchingUser.current = true;
    
    try {
      const { data, error } = await supabaseAuth.auth.getSession();
      
      if (error) {
        console.error('UserContext - Session error:', error);
        setError(error.message);
        setUser(null);
        return;
      }
      
      if (data?.session) {
        console.log('Supabase session found:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown',
        });
        
        console.log('UserContext - Session authenticated:', {
          status: 'authenticated',
          userId: data.session.user.id,
          email: data.session.user.email,
          accessToken: data.session.access_token ? `${data.session.access_token.substring(0, 10)}...` : 'none',
          expires: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown',
          path: typeof window !== 'undefined' ? window.location.pathname : 'server',
          currentUser: user ? 'loaded' : 'not loaded yet',
        });
        
        // If we already have user data for this user, don't fetch again
        if (user && user.id === data.session.user.id) {
          console.log('UserContext - Already have user data, skipping fetch');
          lastFetchedAt.current = Date.now();
          return;
        }
        
        // Schedule user profile fetch with debounce
        console.log('UserContext - Scheduling user profile fetch with delay');
        debouncedFetchUser(data.session.user);
      } else {
        console.log('UserContext - No session found');
        setUser(null);
      }
    } catch (err: any) {
      console.error('UserContext - Error loading session:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setIsLoading(false);
      isFetchingUser.current = false;
    }
  }

  // Improved debounced fetch with longer delay
  const debouncedFetchUser = useCallback(
    debounce((sessionUser: AuthUser) => {
      console.log('UserContext - Executing user profile fetch now');
      fetchUser(sessionUser);
    }, 3000), // Increased from 1500ms to 3000ms
    []
  );

  async function fetchUser(sessionUser: AuthUser) {
    // Skip if already fetching
    if (isFetchingUser.current) {
      console.log('UserContext - User fetch already in progress, skipping');
      return;
    }
    
    isFetchingUser.current = true;
    let attempts = 0;
    const maxAttempts = 3;
    
    try {
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`fetchUser - Starting attempt ${attempts}`);
        
        // Check for user-session cookie as a quick way to get user ID
        const userSessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user-session='));
          
        if (userSessionCookie) {
          const userId = userSessionCookie.split('=')[1];
          console.log(`fetchUser - Found user-session cookie with ID: ${userId}`);
          
          // Verify this matches the session user
          if (userId !== sessionUser.id) {
            console.warn('Cookie user ID does not match session user ID');
          }
        }
        
        console.log('Session found, fetching user data');
        
        // Check if we have fresh data for this user
        if (user && user.id === sessionUser.id && lastFetchedAt.current && 
            (Date.now() - lastFetchedAt.current) < 5 * 60 * 1000) {
          console.log('Using cached user data');
          lastFetchedAt.current = Date.now(); // Refresh timestamp
          return;
        }
        
        // Fetch user profile data
        // ... existing fetch user code ...
        
        // Update last fetched timestamp
        lastFetchedAt.current = Date.now();
        return;
      }
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.message);
    } finally {
      isFetchingUser.current = false;
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
        await fetchUser();
        console.log('Profile updated successfully');
      } catch (err) {
        console.error('Error updating profile:', err);
        throw err;
      }
    },
    [session, fetchUser],
  );

  // Check session only when needed with debounce
  const checkSession = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchedAt.current > SESSION_CACHE_EXPIRY) {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Debounce the fetch call to prevent multiple rapid calls
      fetchTimeoutRef.current = setTimeout(() => {
        fetchUser();
        fetchTimeoutRef.current = null;
      }, 300);
    }
  }, [lastFetchedAt, fetchUser]);

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
        fetchUser();
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
        hasError: !!error
      };
      
      const event = new CustomEvent('authStateChange', { 
        detail: authState,
        bubbles: true
      });
      
      window.dispatchEvent(event);
      
      // Also store minimal auth state in localStorage for potential SSR hydration hints
      try {
        localStorage.setItem('auth_state', JSON.stringify({
          isAuthenticated: !!user,
          timestamp: Date.now()
        }));
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
        accessToken: session.access_token ? `${session.access_token.substring(0, 15)}...` : 'missing',
        expires: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown',
        path: typeof window !== 'undefined' ? window.location.pathname : 'server-side',
        currentUser: user ? `${user.id.substring(0, 8)}...` : 'not loaded yet'
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
        fetchUser();
        fetchTimeoutRef.current = null;
      }, 3000); // Increased delay to 3 seconds to reduce frequency of calls
    } else if (sessionStatus === 'unauthenticated') {
      console.log('UserContext - Session unauthenticated:', { 
        status: 'unauthenticated',
        path: typeof window !== 'undefined' ? window.location.pathname : 'server-side'
      });
      setUser(null);
      setIsLoading(false);
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
    await supabaseAuth.signOut();
    
    setUser(null);
    setSession(null);
    setSessionStatus('unauthenticated');
  };

  const value = {
    user,
    isLoading: isLoading || sessionStatus === 'loading',
    error,
    isFeatureEnabled: checkFeature,
    canCreateMore: checkCanCreateMore,
    logout,
    refreshUser: fetchUser,
    checkSession,
    updateProfile,
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
