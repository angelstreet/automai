'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { isFeatureEnabled, canCreateMore, getPlanFeatures } from '@/lib/features';
import supabaseAuth from '@/lib/supabase-auth';
import { Session } from '@supabase/supabase-js';
import { AuthUser, CustomSupabaseUser } from '@/types/auth';
import { createBrowserSupabase } from '@/lib/supabase';

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
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Add refs to track fetch state and prevent duplicate requests
  const isFetchingRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAttempts = useRef(0);

  // Load Supabase session
  useEffect(() => {
    async function loadSession() {
      setSessionStatus('loading');
      
      // First check for a user-session cookie as a fallback mechanism
      const checkForSessionCookie = () => {
        if (typeof window !== 'undefined') {
          const cookies = document.cookie.split('; ');
          const sessionCookie = cookies.find(c => c.startsWith('user-session='));
          if (sessionCookie) {
            const userId = sessionCookie.split('=')[1];
            console.log('Found user-session cookie with ID:', userId);
            return userId;
          }
        }
        return null;
      };
      
      try {
        // Try to get session from Supabase
        console.log('UserContext - Loading session from Supabase');
        const { data, error } = await Promise.race([
          supabaseAuth.getSession(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Session load timeout after 5s')), 5000)
          )
        ]) as any;
        
        if (error) {
          console.log('Error loading Supabase session:', error);
          
          // Check for cookie as fallback
          const userId = checkForSessionCookie();
          if (userId) {
            console.log('No Supabase session but user-session cookie found, treating as authenticated');
            // We don't have a full session, but we know the user was authenticated recently
            // This helps prevent flashing unauthenticated state while tokens reload
            setSessionStatus('authenticated');
            return;
          }
          
          setSession(null);
          setSessionStatus('unauthenticated');
          return;
        }
        
        if (!data?.session) {
          console.log('No Supabase session found');
          
          // Check for cookie as fallback
          const userId = checkForSessionCookie();
          if (userId) {
            console.log('No Supabase session but user-session cookie found, treating as authenticated');
            // We don't have a full session, but we know the user was authenticated recently
            setSessionStatus('authenticated');
            return;
          }
          
          setSession(null);
          setSessionStatus('unauthenticated');
          return;
        }
        
        console.log('Supabase session found:', { 
          userId: data.session.user.id,
          email: data.session.user.email,
          expiresAt: data.session.expires_at 
            ? new Date(data.session.expires_at * 1000).toISOString() 
            : 'unknown'
        });
        
        setSession(data.session);
        setSessionStatus('authenticated');
      } catch (error) {
        console.error('Error loading Supabase session:', error);
        
        // Check for cookie as fallback
        const userId = checkForSessionCookie();
        if (userId) {
          console.log('Error loading session but user-session cookie found, treating as authenticated');
          // We don't have a full session, but we know the user was authenticated recently
          setSessionStatus('authenticated');
          return;
        }
        
        setSession(null);
        setSessionStatus('unauthenticated');
      }
    }
    
    loadSession();
    
    // Set up auth state change listener
    const { data: authListener } = supabaseAuth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event);
      if (session) {
        setSession(session);
        setSessionStatus('authenticated');
      } else {
        setSession(null);
        setSessionStatus('unauthenticated');
      }
    });
    
    // Cleanup
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchUser = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping duplicate request');
      return;
    }

    // Limit fetch attempts to prevent infinite loops
    if (fetchAttempts.current > 3) {
      console.warn('Too many fetch attempts, stopping to prevent infinite loop');
      
      // Don't set error if we already have a user (prevents UI blocking)
      if (!user) {
        setError('Failed to fetch user data after multiple attempts');
      } else {
        console.log('Using existing user data despite fetch attempts limit');
      }
      
      setIsLoading(false);
      return;
    }

    // Add a delay before starting the fetch to ensure auth is ready
    const delayPromise = () => new Promise(resolve => 
      setTimeout(resolve, fetchAttempts.current * 300) // Increase delay with each attempt
    );
    
    await delayPromise();

    try {
      isFetchingRef.current = true;
      fetchAttempts.current += 1;
      console.log(`fetchUser - Starting attempt ${fetchAttempts.current}`);

      // First check the cookie fallback system
      let hasSessionCookie = false;
      if (typeof window !== 'undefined') {
        const cookies = document.cookie.split('; ');
        const sessionCookie = cookies.find(c => c.startsWith('user-session='));
        if (sessionCookie) {
          const userId = sessionCookie.split('=')[1];
          console.log('fetchUser - Found user-session cookie with ID:', userId);
          hasSessionCookie = true;
        }
      }

      if (!session?.user && !hasSessionCookie) {
        console.log('No active session found in fetchUser and no session cookie');
        setUser(null);
        setError('No active session');
        setIsLoading(false);
        return;
      }

      console.log('Session found, fetching user data');

      // Check if we have a cached user and it's still valid
      const now = Date.now();
      const cachedData =
        typeof window !== 'undefined' ? localStorage.getItem(SESSION_CACHE_KEY) : null;

      if (cachedData) {
        try {
          const { user: cachedUser, timestamp } = JSON.parse(cachedData);
          if (now - timestamp < SESSION_CACHE_EXPIRY) {
            console.log('Using cached user data');
            setUser(cachedUser);
            setError(null);
            setIsLoading(false);
            setLastFetch(timestamp);
            return;
          }
        } catch (error) {
          console.warn('Invalid session cache, fetching fresh data');
        }
      }

      console.log('Fetching fresh user data from API');
      
      try {
        // Check if we have a valid auth session before making the request
        const supabase = createBrowserSupabase();
        const { data: sessionData } = await supabase.auth.getSession();
        
        console.log('fetchUser - Checking Supabase session:', {
          hasSession: !!sessionData.session,
          sessionExpiry: sessionData.session?.expires_at ? new Date(sessionData.session.expires_at * 1000).toISOString() : 'n/a',
          path: typeof window !== 'undefined' ? window.location.pathname : 'server-side'
        });
        
        if (!sessionData.session) {
          console.error('fetchUser - No valid Supabase session found');
          setError('No valid authentication session');
          setUser(null);
          setIsLoading(false);
          isFetchingRef.current = false;
          return;
        }
        
        console.log('fetchUser - Valid session found with token:', 
          sessionData.session.access_token ? `${sessionData.session.access_token.substring(0, 15)}...` : 'missing token');
        
        // Use the current origin for API calls
        const apiUrl = typeof window !== 'undefined' 
          ? `${window.location.origin}/api/auth/profile`
          : 'http://localhost:3000/api/auth/profile';
        
        let userData = null;
        let lastError = null;
        
        // In this try block, we'll attempt to fetch the profile from our server
        // If the user doesn't exist in the database, the server will create it
        try {
          console.log('fetchUser - Calling profile API:', apiUrl);
          
          const response = await fetch(apiUrl, {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Authorization': `Bearer ${sessionData.session.access_token}`,
            },
          });

          console.log('fetchUser - Profile API response:', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
          });

          if (response.ok) {
            userData = await response.json();
            console.log('fetchUser - User data fetched successfully:', {
              userId: userData?.id ? `${userData.id.substring(0, 8)}...` : 'missing',
              email: userData?.email || 'missing',
              tenantId: userData?.tenantId || 'missing',
              tenantName: userData?.tenantName || 'missing'
            });
          } else {
            const errorText = await response.text();
            console.log(`fetchUser - Profile fetch failed: Status ${response.status}`, {
              errorText: errorText.substring(0, 100) + (errorText.length > 100 ? '...' : ''),
              url: apiUrl
            });
            lastError = { status: response.status, error: errorText };
          }
        } catch (err) {
          console.error('fetchUser - Error fetching user data:', err);
          lastError = { error: err };
        }

        if (!userData) {
          console.error('Failed to fetch profile:', lastError);
          
          // Check if we already have a user - if so, use that instead of throwing an error
          if (user) {
            console.log('Using existing user data despite profile fetch failure');
            // Keep existing user data and don't throw error
            setIsLoading(false);
            isFetchingRef.current = false;
            return;
          }
          
          throw new Error(`Failed to fetch user profile: ${lastError?.status || ''} ${lastError?.error || 'Unknown error'}`);
        }

        // Cache the user data in localStorage and also set a cookie as backup
        if (typeof window !== 'undefined') {
          // Store in localStorage
          localStorage.setItem(
            SESSION_CACHE_KEY,
            JSON.stringify({
              user: userData,
              timestamp: now,
            }),
          );
          
          // Also store a minimal version in a cookie as backup
          // This helps in cases where localStorage might not be synced between tabs
          try {
            const userId = userData?.id;
            const expiry = new Date();
            expiry.setTime(expiry.getTime() + SESSION_CACHE_EXPIRY);
            document.cookie = `user-session=${userId}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;
            console.log('Set user-session cookie for user ID:', userId);
          } catch (e) {
            console.warn('Failed to set user-session cookie:', e);
          }
        }

        setUser(userData);
        setError(null);
        setLastFetch(now);
        // Reset fetch attempts on success
        fetchAttempts.current = 0;
      } catch (err: any) {
        console.error('Error in fetchUser:', err);
        setError(`Failed to fetch user profile: ${err.message || 'Unknown error'}`);
        setUser(null);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    } catch (err) {
      console.error('Error in fetchUser:', err);
      setError('Failed to fetch user profile');
      setUser(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [session]);

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
    if (now - lastFetch > SESSION_CACHE_EXPIRY) {
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
  }, [lastFetch, fetchUser]);

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
        if (lastFetch && now - lastFetch < SESSION_CACHE_EXPIRY) {
          console.log('UserContext - User data is fresh, no need to refetch');
          return;
        }
      }
      
      // Check if we're already fetching
      if (isFetchingRef.current) {
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
