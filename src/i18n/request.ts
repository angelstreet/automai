import { getRequestConfig } from 'next-intl/server';

import { defaultLocale } from '@/config';

import { getMessages } from './index';

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
