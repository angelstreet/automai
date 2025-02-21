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
  // Match all routes including tenant routes
  matcher: [
    // Match all public routes
    '/',
    // Match all locale routes
    '/(fr|en)/:path*',
    // Match all tenant routes
    '/(fr|en)/[tenant]/:path*'
  ]
};