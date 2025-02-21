import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales } from '@/config';
import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';
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

export default async function LocaleLayout(props: Props) {
  const { children, params } = props;
  // Await params explicitly
  const awaitedParams = await Promise.resolve(params);
  if (!awaitedParams.locale) {
    notFound();
    return null;
  }

  const validLocale = await validateLocale(awaitedParams.locale);
  
  if (!validLocale) {
    notFound();
    return null;
  }

  const messages = await getMessages(validLocale);
  
  return (
    <html lang={validLocale} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={validLocale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}