// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, pathnames } from './config';

export default createMiddleware({
  locales,
  defaultLocale,
  pathnames,
  localePrefix: 'always'
});

export const config = {
  matcher: ['/', '/(fr|en)/:path*']
};