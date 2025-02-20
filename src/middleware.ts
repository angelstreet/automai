import createMiddleware from 'next-intl/middleware';
import { pathnames } from './config';

export default createMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  pathnames,
  localePrefix: 'always'
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … if they contain a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // However, match all pathnames within `/dashboard`
    '/dashboard/:path*'
  ]
}; 