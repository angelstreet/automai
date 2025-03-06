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
      try {
        const { data, error } = await supabaseAuth.getSession();
        if (error || !data.session) {
          console.log('No Supabase session found or error:', error);
          setSession(null);
          setSessionStatus('unauthenticated');
          return;
        }
        
        setSession(data.session);
        setSessionStatus('authenticated');
      } catch (error) {
        console.error('Error loading Supabase session:', error);
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
      setError('Failed to fetch user data after multiple attempts');
      setIsLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      fetchAttempts.current += 1;

      if (!session?.user) {
        console.log('No active session found in fetchUser');
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
        
        if (!sessionData.session) {
          console.error('No valid Supabase session found');
          setError('No valid authentication session');
          setUser(null);
          setIsLoading(false);
          isFetchingRef.current = false;
          return;
        }
        
        console.log('Current auth session:', 'Valid session with token');
        
        // Get the current hostname and port
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const currentPort = typeof window !== 'undefined' ? window.location.port : '3000';
        
        // First try the current port, then fallback to others
        const ports = [currentPort, '3000', '3001', '3002', '3003'].filter((p, i, arr) => arr.indexOf(p) === i);
        let userData = null;
        let lastError = null;
        
        // In this try block, we'll attempt to fetch the profile from our server
        // If the user doesn't exist in the database, the server will create it
        try {
          // Only try the current port first for efficiency
          const apiUrl = `http://${hostname}:${currentPort}/api/auth/profile`;
          console.log('Trying profile endpoint at:', apiUrl);
          
          const response = await fetch(apiUrl, {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Authorization': `Bearer ${sessionData.session.access_token}`,
            },
          });

          if (response.ok) {
            userData = await response.json();
            console.log('User data fetched successfully');
          } else {
            const errorText = await response.text();
            console.log(`Profile fetch failed: Status ${response.status}`, errorText);
            lastError = { status: response.status, error: errorText };
            
            // If we get a 401 (Unauthorized) or 404 (Not Found), we'll try other ports
            if (response.status === 401 || response.status === 404) {
              // Try other ports
              for (const port of ports) {
                if (port === currentPort) continue; // Skip current port as we already tried it
                
                try {
                  const apiUrl = `http://${hostname}:${port}/api/auth/profile`;
                  console.log('Trying profile endpoint at:', apiUrl);
                  
                  const response = await fetch(apiUrl, {
                    credentials: 'include',
                    headers: {
                      'Cache-Control': 'no-cache',
                      'Authorization': `Bearer ${sessionData.session.access_token}`,
                    },
                  });

                  if (response.ok) {
                    userData = await response.json();
                    console.log('User data fetched successfully from port', port);
                    break;
                  }

                  const errorText = await response.text();
                  lastError = { port, status: response.status, error: errorText };
                  console.log(`Profile fetch failed on port ${port}: Status ${response.status}`, errorText);
                } catch (err) {
                  console.log(`Error fetching from port ${port}:`, err);
                  lastError = { port, error: err };
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          lastError = { error: err };
        }

        if (!userData) {
          console.error('Failed to fetch profile from all ports:', lastError);
          throw new Error('Failed to fetch user profile from any available port');
        }

        // Cache the user data
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            SESSION_CACHE_KEY,
            JSON.stringify({
              user: userData,
              timestamp: now,
            }),
          );
        }

        setUser(userData);
        setError(null);
        setLastFetch(now);
        // Reset fetch attempts on success
        fetchAttempts.current = 0;
      } catch (err) {
        console.error('Error in fetchUser:', err);
        setError('Failed to fetch user profile');
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

  useEffect(() => {
    if (sessionStatus === 'loading') {
      setIsLoading(true);
      return;
    }

    if (sessionStatus === 'authenticated' && session?.user) {
      console.log('Session authenticated, fetching user data');
      // Debounce the initial fetch
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      fetchTimeoutRef.current = setTimeout(() => {
        fetchUser();
        fetchTimeoutRef.current = null;
      }, 300);
    } else if (sessionStatus === 'unauthenticated') {
      console.log('Session unauthenticated, clearing user data');
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
  }, [sessionStatus, session, fetchUser]);

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
