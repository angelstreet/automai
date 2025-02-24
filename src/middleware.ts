// src/middleware.ts
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, pathnames } from './config';

export default createIntlMiddleware({
  locales,
  defaultLocale,
  pathnames,
  localePrefix: 'always',
});

export const config = {
  matcher: [
    // Match all routes
    '/',
    '/(fr|en)/:path*',
  ],
};
