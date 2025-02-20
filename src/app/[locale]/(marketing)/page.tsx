import { Hero } from './components/hero';
import { Features } from './components/features';
import { Footer } from '@/components/layout/footer';
import { SiteHeader } from '@/components/layout/site-header';

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