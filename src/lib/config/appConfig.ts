/**
 * Application Configuration
 * General application configuration settings
 */

/**
 * Application metadata
 */
export const APP_METADATA = {
  name: 'AutomAI',
  description: 'Automated deployment platform for AI and ML models',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://automai.app',
};

/**
 * Navigation configuration
 */
export const NAVIGATION = {
  home: '/',
  dashboard: '/dashboard',
  repositories: '/repositories',
  deployments: '/deployment',
  hosts: '/hosts',
  team: '/team',
  settings: '/settings',
  profile: '/profile',
};

/**
 * Date format settings
 */
export const DATE_FORMATS = {
  default: 'MMM d, yyyy',
  withTime: 'MMM d, yyyy h:mm a',
  timestamp: 'yyyy-MM-dd HH:mm:ss',
  iso: 'yyyy-MM-dd',
};

/**
 * Pagination settings
 */
export const PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50, 100],
};

/**
 * Theme settings
 */
export const THEME = {
  defaultTheme: 'system' as 'light' | 'dark' | 'system',
  colorSchemes: ['light', 'dark'],
};

/**
 * Locale settings
 */
export const LOCALE = {
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  fallbackLocale: 'en',
};

/**
 * API settings
 */
export const API = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Cache settings
 */
export const CACHE = {
  defaultTtl: 60, // 60 seconds
  longTtl: 3600, // 1 hour
  staticTtl: 86400, // 24 hours
};

/**
 * Team settings
 */
export const TEAM = {
  maxTeamNameLength: 50,
  maxTeamDescriptionLength: 500,
  maxTeamMembersCount: 100,
};

// Export app configuration
const appConfig = {
  APP_METADATA,
  NAVIGATION,
  DATE_FORMATS,
  PAGINATION,
  THEME,
  LOCALE,
  API,
  CACHE,
  TEAM,
};

export default appConfig;
