import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { generateStaticParams } from './layout';

export { generateStaticParams };

export const metadata: Metadata = {
  title: 'AutomAI - Automation Platform',
  description: 'Automate your development workflow with AI',
};

// Force this page to be static
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export default async function HomePage() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
