import { getRequestConfig } from 'next-intl/server';
import { getMessages } from './index';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!locale) throw new Error('Locale is required');
  return {
    locale,
    messages: await getMessages(locale),
    timeZone: 'Europe/Paris'
  };
});