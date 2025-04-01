import { NextIntlClientProvider } from 'next-intl';

import { locales } from '@/config';
import { getMessages } from '@/i18n';

// Define props type
type Props = {
  children: React.ReactNode;
  params: { locale: (typeof locales)[number] }; // "en" | "fr"
};

export default async function LocaleLayout({ children, params }: Props) {
  console.log('Rendering LocaleLayout, params:', params);
  const resolvedParams = 'then' in params ? await params : params;
  const { locale } = resolvedParams;
  console.log('LocaleLayout resolved locale:', locale);

  // Fetch messages for the valid locale
  const messages = await getMessages(locale);
  console.log('LocaleLayout messages loaded');

  try {
    console.log('About to render NextIntlClientProvider with locale:', locale);
    console.log('Messages sample:', Object.keys(messages).slice(0, 3));
    
    return (
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    );
  } catch (error) {
    console.error('Error in LocaleLayout:', error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-red-500">
        <h1 className="text-2xl font-bold mb-4">Error in locale layout</h1>
        <p>Failed to initialize locale provider. Please try refreshing the page.</p>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto max-w-full">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </div>
    );
  }
}
