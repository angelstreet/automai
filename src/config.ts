import { Pathnames } from 'next-intl/navigation';

export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en' as const;

export const pathnames = {
  '/': '/',
  '/login': '/login',
  '/signup': '/signup',
  '/features': '/features',
  '/pricing': '/pricing',
  '/docs': '/docs',
  '/dashboard': '/dashboard',
  '/scripts': '/scripts',
  '/settings': '/settings'
} satisfies Pathnames<typeof locales>;

// Use the default: `always`
export const localePrefix = 'always';

export type AppPathnames = keyof typeof pathnames; 