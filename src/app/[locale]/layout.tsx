import { NextIntlClientProvider } from 'next-intl';

import { ToasterProvider } from '@/components/shadcn/toaster';
import { locales } from '@/config';
import { getMessages } from '@/i18n';

// Define props type
type Props = {
  children: React.ReactNode;
  params: { locale: (typeof locales)[number] }; // "en" | "fr"
};

export default async function LocaleLayout({ children, params }: Props) {
  const resolvedParams = 'then' in params ? await params : params;
  const { locale } = resolvedParams;

  // Fetch messages for the valid locale
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
      <ToasterProvider />
    </NextIntlClientProvider>
  );
}
