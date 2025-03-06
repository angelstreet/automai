'use client';

import { redirect, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useUser } from '@/context/UserContext';
import supabaseAuth from '@/lib/supabase-auth';

import { Features } from '../(marketing)/_components/Features';
import { Hero } from '../(marketing)/_components/Hero';

export function HomePage() {
  const { user, isLoading, error } = useUser();
  const params = useParams();
  const locale = params.locale as string;
  const [hasSession, setHasSession] = useState(false);
  
  useEffect(() => {
    async function checkSession() {
      console.log("HomePage - Init session check, current state:", { 
        hasUser: !!user, 
        userLoading: isLoading,
        userError: error 
      });
      
      const { data } = await supabaseAuth.getSession();
      console.log("HomePage - Supabase session result:", {
        hasSession: !!data.session,
        sessionExpiry: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'n/a',
        userContextReady: !!user,
        pathname: window.location.pathname
      });
      
      setHasSession(!!data.session);
    }
    
    checkSession();
  }, [user, isLoading, error]);

  // Debug log when redirection conditions are evaluated
  useEffect(() => {
    console.log("HomePage - Redirect evaluation:", {
      hasSession,
      hasUser: !!user,
      userTenant: user?.tenantName || 'none',
      isMarketingRoute: window.location.pathname === `/${locale}` || window.location.pathname === `/${locale}/`,
      shouldRedirect: hasSession && user
    });
  }, [hasSession, user, locale]);

  // Only redirect if not on root locale path (don't redirect from /en/)
  if (hasSession && user && window.location.pathname !== `/${locale}` && window.location.pathname !== `/${locale}/`) {
    console.log("HomePage - Redirecting to dashboard");
    const tenant = user.tenantName || 'trial';
    redirect(`/${locale}/${tenant}/dashboard`);
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
