export const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
] as const;

// Use a static readonly array of strings for locales
export const locales = ['en', 'fr', 'es', 'it', 'de'] as const;

export const defaultLocale = 'en' as const;
