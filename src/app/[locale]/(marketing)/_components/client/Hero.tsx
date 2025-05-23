'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/shadcn/button';

export function Hero() {
  console.log('Rendering Hero component');

  try {
    const t = useTranslations('index');
    const locale = useLocale();

    return (
      <div className="relative isolate px-6 pt-24 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-12 lg:py-53">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{t('title')}</h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{t('desc')}</p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg">
                <Link href={`/${locale}/signup`}>{t('get_started')}</Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href={`/${locale}/docs`}>{t('learn_more')}</Link>
              </Button>
            </div>
          </div>
        </div>
        <div
          className="absolute inset-x-0 -top-10 -z-10 transform-gpu overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering Hero component:', error);
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        <h2 className="font-bold mb-2">Hero component error</h2>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}
