'use client';

import { redirect, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useUser } from '@/context/UserContext';

import { Features } from '../(marketing)/_components/Features';
import { Hero } from '../(marketing)/_components/Hero';

export function HomePage() {
  const { data: session } = useSession();
  const { user } = useUser();
  const params = useParams();
  const locale = params.locale as string;

  if (session?.user && user) {
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
