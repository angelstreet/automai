import { Hero } from './(marketing)/_components/Hero';
import { Features } from './(marketing)/_components/Features';
import { SiteHeader } from '@/components/layout/SiteHeader';

export default async function Page() {

  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="flex flex-col">
          <Hero />
          <Features />
        </div>
      </main>
    </div>
  );
}
