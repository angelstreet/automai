import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';

import { RouteGuard } from '@/components/Auth/RouteGuard';
import { ToasterProvider } from '@/components/shadcn/toaster';
import { ThemeProvider } from '@/components/Theme/ThemeProvider';
import { locales } from '@/config';
import { RoleProvider } from '@/context/RoleContext';
import { UserProvider } from '@/context/UserContext';
import { getMessages } from '@/i18n';

const inter = Inter({ subsets: ['latin'] });

type Props = {
  children: React.ReactNode;
<<<<<<< HEAD
  params: Promise<{ locale: string }>;
=======
  params: { locale: string } | Promise<{ locale: string }>;
>>>>>>> 76b3d0ecc40cca362a363b243e7fbc93813a555c
};

async function validateLocale(locale: string) {
  // Simulate async validation
  await Promise.resolve();
  return locales.includes(locale as any) ? locale : null;
}

<<<<<<< HEAD
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
=======
export default async function LocaleLayout(props: Props) {
  const { children, params } = props;
  
  // Ensure params is properly awaited if it's a promise
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = resolvedParams.locale;
>>>>>>> 76b3d0ecc40cca362a363b243e7fbc93813a555c

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
                <ToasterProvider />
              </ThemeProvider>
            </NextIntlClientProvider>
          </RoleProvider>
        </UserProvider>
      </body>
    </html>
  );
}
