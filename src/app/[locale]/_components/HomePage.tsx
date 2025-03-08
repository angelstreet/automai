'use client';

import { redirect, useParams } from 'next/navigation';
import * as React from 'react';

import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/hooks/useAuth';

import { Features } from '../(marketing)/_components/Features';
import { Hero } from '../(marketing)/_components/Hero';

export function HomePage() {
  const { user, isLoading, error } = useAuth();
  const paramsPromise = useParams();
  const params = React.use(paramsPromise);
  const locale = params.locale as string;

  // Debug logs to see what's happening
  console.log('HomePage rendering:', { 
    user: user ? 'exists' : 'null', 
    isLoading, 
    hasError: !!error,
    errorMsg: error,
    locale, 
    path: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
  });

  // Only redirect if authenticated and not on root locale path
  // Don't redirect from paths like /en/ or /fr/
  const isRootLocalePath =
    typeof window !== 'undefined' && 
    (window.location.pathname === `/${locale}` || window.location.pathname === `/${locale}/`);

  // Add loading state to show we're attempting to render
  if (isLoading) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">Initializing application</p>
        </div>
      </div>
    );
  }

  // Show error state if any
  if (error) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-semibold">Error initializing application</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (user && !isRootLocalePath) {
    // Always use lowercase for tenant name
    const tenant = (user.tenant_name || 'trial').toLowerCase();
    console.log(`Redirecting authenticated user to: /${locale}/${tenant}/dashboard`);
    redirect(`/${locale}/${tenant}/dashboard`);
  }

  // If we're not loading, there's no error and we're not redirecting,
  // then render the landing page
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
