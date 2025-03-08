'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create Supabase client
    const supabase = createClient();
    
    // Get initial session and user
    const initializeAuth = async () => {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        // Get user if session exists
        if (session) {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user || null);
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
  };
} 