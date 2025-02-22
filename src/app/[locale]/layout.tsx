import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales } from '@/config';
import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';
import { getMessages } from '@/i18n';
import { UserProvider } from '@/lib/contexts/UserContext';
import { RouteGuard } from '@/components/route-guard';

const inter = Inter({ subsets: ['latin'] });

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

async function validateLocale(locale: string) {
  // Simulate async validation
  await Promise.resolve();
  return locales.includes(locale as any) ? locale : null;
}

export default async function LocaleLayout(props: Props) {
  const { children, params } = props;
  const resolvedParams = await params;
  
  if (!resolvedParams.locale) {
    notFound();
    return null;
  }

  const validLocale = await validateLocale(resolvedParams.locale);
  
  if (!validLocale) {
    notFound();
    return null;
  }

  const messages = await getMessages(validLocale);
  
  return (
    <html lang={validLocale} suppressHydrationWarning>
      <body className={inter.className}>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider 
              locale={validLocale} 
              messages={messages}
              timeZone="UTC"
            >
              <RouteGuard>{children}</RouteGuard>
            </NextIntlClientProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}