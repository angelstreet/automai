import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';

import { RouteGuard } from '@/components/Auth/RouteGuard';
import { Toaster } from '@/components/shadcn/toaster';
import { ThemeProvider } from '@/components/Theme/ThemeProvider';
import { locales } from '@/config';
import { RoleProvider } from '@/context/RoleContext';
import { UserProvider } from '@/context/UserContext';
import { getMessages } from '@/i18n';

const inter = Inter({ subsets: ['latin'] });

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

async function validateLocale(locale: string) {
  // Simulate async validation
  await Promise.resolve();
  return locales.includes(locale as any) ? locale : null;
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  if (!locale) {
    notFound();
    return null;
  }

  const validLocale = await validateLocale(locale);

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
          <RoleProvider>
            <NextIntlClientProvider locale={validLocale} messages={messages} timeZone="UTC">
              <ThemeProvider defaultTheme={theme} storageKey="theme">
                <RouteGuard>{children}</RouteGuard>
                <Toaster />
              </ThemeProvider>
            </NextIntlClientProvider>
          </RoleProvider>
        </UserProvider>
      </body>
    </html>
  );
}
