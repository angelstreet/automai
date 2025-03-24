import { Hero } from './(marketing)/_components/Hero';
import { Features } from './(marketing)/_components/Features';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { locales } from '@/config';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return await locales.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: { locale: string } }) {
  // Check if user is authenticated and redirect them to their tenant dashboard
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data } = await supabase.auth.getUser();

    // If user is authenticated, redirect to their tenant dashboard
    if (data?.user) {
      const tenant = data.user.user_metadata?.tenant_name || 'trial';
      redirect(`/${params.locale}/${tenant}/dashboard`);
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    // Continue to show marketing page if authentication check fails
  }

  // If not authenticated, show marketing page
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
