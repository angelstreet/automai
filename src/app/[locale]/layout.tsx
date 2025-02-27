import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales } from '@/config';
import { Inter } from 'next/font/google';
import { getMessages } from '@/i18n';
import { UserProvider } from '@/lib/contexts/UserContext';
import { RouteGuard } from '@/components/route-guard';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/shadcn/toaster';
import { cookies } from 'next/headers';

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

  // Get theme from cookie
  const cookieList = await cookies();
  const themeCookie = cookieList.get('theme');
  const theme = themeCookie ? themeCookie.value : 'system';

  return (
    <html lang={validLocale} suppressHydrationWarning>
      <body className={inter.className}>
        <UserProvider>
          <NextIntlClientProvider locale={validLocale} messages={messages} timeZone="UTC">
            <ThemeProvider defaultTheme={theme} storageKey="theme">
              <RouteGuard>{children}</RouteGuard>
              <Toaster />
            </ThemeProvider>
          </NextIntlClientProvider>
        </UserProvider>
      </body>
    </html>
  );
}
