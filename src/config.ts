import { Pathnames } from 'next-intl/navigation';

export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en' as const;

export const pathnames = {
  '/': '/',
  '/dashboard': '/dashboard',
  '/scripts': '/scripts',
  '/settings': '/settings',
  '/login': '/login',
  '/signup': '/signup'
} satisfies Pathnames<typeof locales>;

// Use the default: `always`
export const localePrefix = 'always';

export type AppPathnames = keyof typeof pathnames; 