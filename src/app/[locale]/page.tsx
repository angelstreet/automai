import { Hero } from './components/hero';
import { Features } from './components/features';
import { SiteHeader } from '@/components/layout/site-header';
import { Footer } from '@/components/layout/footer';
import { locales } from '@/config';

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