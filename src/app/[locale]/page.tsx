import { Footer } from '@/components/Layout/Footer';
import { SiteHeader } from '@/components/Layout/SiteHeader';
import { locales } from '@/config';

import { Features } from './(marketing)/_components/Features';
import { Hero } from './(marketing)/_components/Hero';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function HomePage() {
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
