import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { ToasterProvider } from '@/components/shadcn/toaster';
import { locales } from '@/config';
import { getMessages } from '@/i18n';

// Define props type
type Props = {
  children: React.ReactNode;
  params: { locale: (typeof locales)[number] }; // "en" | "fr"
};

// Validate locale asynchronously
async function validateLocale(locale: string): Promise<string | null> {
  await Promise.resolve(); // Simulate async validation
  return locales.includes(locale as any) ? locale : null;
}

export default async function LocaleLayout({ children, params }: Props) {
  // Resolve params if it's a Promise (for safety in Next.js 15 edge cases)
  const resolvedParams = 'then' in params ? await params : params;
  const { locale } = resolvedParams;

  // Early exit if locale is missing
  if (!locale) {
    notFound();
  }

  // Validate locale
  const validLocale = await validateLocale(locale);
  if (!validLocale) {
    notFound();
  }

  // Fetch messages for the valid locale
  const messages = await getMessages(validLocale);

  return (
    <NextIntlClientProvider locale={validLocale} messages={messages} timeZone="UTC">
      {children}
      <ToasterProvider />
    </NextIntlClientProvider>
  );
}
