'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Create Supabase client
    const supabase = createClient();
    
    // Get initial session and user
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error in useAuth:', sessionError);
          throw sessionError;
        }
        
        // Debug session data
        console.log('Session data in useAuth:', sessionData);
        
        setSession(sessionData.session);
        
        // Get user if session exists
        if (sessionData.session) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('User error in useAuth:', userError);
            throw userError;
          }
          
          setUser(userData.user);
          console.log('User loaded in useAuth:', userData.user);
        } else {
          console.log('No session found in useAuth');
          
          // Only try to refresh the session if we're not on a login/auth page
          // This prevents unnecessary refresh attempts on auth pages
          const isAuthPage = 
            typeof window !== 'undefined' && 
            (window.location.pathname.includes('/login') || 
             window.location.pathname.includes('/signup') || 
             window.location.pathname.includes('/auth-redirect') ||
             window.location.pathname.includes('/forgot-password') ||
             window.location.pathname.includes('/reset-password'));
          
          if (!isAuthPage) {
            try {
              console.log('Attempting to refresh session...');
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (!refreshError && refreshData.session) {
                console.log('Session refreshed successfully:', refreshData.session);
                setSession(refreshData.session);
                setUser(refreshData.user);
              } else if (refreshError) {
                console.log('Failed to refresh session:', refreshError);
              }
            } catch (refreshErr) {
              console.error('Error during session refresh:', refreshErr);
            }
          } else {
            console.log('Skipping session refresh on auth page');
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err instanceof Error ? err : new Error('Unknown authentication error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        console.log('Auth state changed:', event);
        
        setSession(newSession);
        
        if (newSession) {
          try {
            // Explicitly get the user to ensure we have the latest data
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
              console.error('Error getting user after auth state change:', userError);
              throw userError;
            }
            
            setUser(userData.user);
            console.log('User updated in auth state change:', userData.user);
          } catch (err) {
            console.error('Error getting user after auth state change:', err);
            setError(err instanceof Error ? err : new Error('Failed to get user data'));
          }
        } else {
          setUser(null);
          console.log('Session cleared in auth state change');
        }
        
        setIsLoading(false);
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}