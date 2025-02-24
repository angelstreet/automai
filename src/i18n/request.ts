import { getRequestConfig } from 'next-intl/server';
import { getMessages } from './index';
import { defaultLocale } from '@/config';

export default getRequestConfig(async () => {
  const locale = await new Promise<string>((resolve) => {
    // Resolve with default locale after all microtasks are processed
    queueMicrotask(() => resolve(defaultLocale));
  });

  return {
    locale,
    messages: await getMessages(locale),
    timeZone: 'Europe/Paris',
  };
});
