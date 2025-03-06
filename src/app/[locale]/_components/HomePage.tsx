'use client';

import { redirect, useParams } from 'next/navigation';

import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useUser } from '@/context/UserContext';

import { Features } from '../(marketing)/_components/Features';
import { Hero } from '../(marketing)/_components/Hero';

export function HomePage() {
  const { user } = useUser();
  const params = useParams();
  const locale = params.locale as string;
  
  // Only redirect if authenticated and not on root locale path
  // Don't redirect from paths like /en/ or /fr/
  const isRootLocalePath = window.location.pathname === `/${locale}` || window.location.pathname === `/${locale}/`;
  
  if (user && !isRootLocalePath) {
    // Always use lowercase for tenant name
    const tenant = (user.tenantName || 'trial').toLowerCase();
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
