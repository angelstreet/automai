import * as React from 'react';

import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';

import { Features } from '../(marketing)/_components/Features';
import { Hero } from '../(marketing)/_components/Hero';

export function HomePage() {
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
