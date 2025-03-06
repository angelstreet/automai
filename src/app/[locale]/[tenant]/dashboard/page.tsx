'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardHeader } from './_components/DashboardHeader';
import { DashboardTabs } from './_components/DashboardTabs';
import { useUser } from '@/context/UserContext';
import supabaseAuth from '@/lib/supabase-auth';

export default function DashboardPage() {
  const { user, isLoading, error } = useUser();
  const params = useParams();
  
  // Add debug logging for dashboard page
  useEffect(() => {
    // Log auth state on initial render
    console.log('DashboardPage - Mounted', {
      hasUser: !!user,
      isLoading,
      error: error ? `${error}` : null,
      tenant: params.tenant,
      locale: params.locale,
      path: typeof window !== 'undefined' ? window.location.pathname : 'server-side'
    });
    
    // Check session
    async function checkSession() {
      const { data } = await supabaseAuth.getSession();
      console.log('DashboardPage - Session check:', {
        hasSession: !!data.session,
        sessionExpiry: data.session?.expires_at 
          ? new Date(data.session.expires_at * 1000).toISOString() 
          : 'n/a',
        now: new Date().toISOString()
      });
    }
    
    checkSession();
  }, [user, isLoading, error, params]);
  
  return (
    <div className="flex-1 space-y-4">
      <DashboardHeader />
      <DashboardTabs />
    </div>
  );
}
