import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';

import { RouteGuard } from '@/components/Auth/RouteGuard';
import { Toaster } from '@/components/Shadcn/toaster';
import { ThemeProvider } from '@/components/Theme/ThemeProvider';
import { locales } from '@/config';
import { RoleProvider } from '@/context/RoleContext';
import { UserProvider } from '@/context/UserContext';
import { getMessages } from '@/i18n';

const inter = Inter({ subsets: ['latin'] });

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout(props: Props) {
  const { children, params } = props;
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  if (!locale || !locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages(locale);
  const cookieStore = cookies();
  const themeCookie = await cookieStore.get('theme');
  const theme = themeCookie ? themeCookie.value : 'system';

  return (
    <UserProvider>
      <RoleProvider>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <ThemeProvider defaultTheme={theme} storageKey="theme">
            <RouteGuard>{children}</RouteGuard>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </RoleProvider>
    </UserProvider>
  );
}
