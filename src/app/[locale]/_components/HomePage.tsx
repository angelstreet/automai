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
  const { user } = useUser();
  const params = useParams();
  const locale = params.locale as string;
  const [hasSession, setHasSession] = useState(false);
  
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabaseAuth.getSession();
      setHasSession(!!data.session);
    }
    
    checkSession();
  }, []);

  if (hasSession && user) {
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
