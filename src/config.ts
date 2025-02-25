import { Pathnames } from 'next-intl/navigation';

export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en' as const;

export const pathnames = {
  // Marketing routes
  '/': '/',
  '/features': '/features',
  '/pricing': '/pricing',
  '/docs': '/docs',

  // Auth routes
  '/login': '/login',
  '/signup': '/signup',
  '/forgot-password': '/forgot-password',

  // Workspace/Tenant routes
  '/[tenant]/dashboard': '/[tenant]/dashboard',
  '/[tenant]/scripts': '/[tenant]/scripts',
  '/[tenant]/settings': '/[tenant]/settings',
  '/[tenant]/tests': '/[tenant]/tests',
  '/[tenant]/reports': '/[tenant]/reports',
  '/[tenant]/profile': '/[tenant]/profile',
  '/[tenant]/team': '/[tenant]/team',
  '/[tenant]/billing': '/[tenant]/billing',
  '/[tenant]/virtualization': '/[tenant]/virtualization',
} satisfies Pathnames<typeof locales>;

// Use the default: `always`
export const localePrefix = 'always';

export type AppPathnames = keyof typeof pathnames;
