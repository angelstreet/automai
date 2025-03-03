export const PLATFORM_PREFIXES = {
  python: 'PYT',
  web: 'WEB',
  desktop: 'DSK',
  android: 'AND',
  ios: 'IOS',
  api: 'API',
} as const;

export const _PLATFORMS = Object.keys(PLATFORM_PREFIXES) as Array<keyof typeof PLATFORM_PREFIXES>;
