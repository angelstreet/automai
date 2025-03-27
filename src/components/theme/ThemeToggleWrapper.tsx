import { ThemeToggleStatic } from './ThemeToggleStatic';

/**
 * Server component wrapper for ThemeToggle
 * This allows for better prerendering and suspense in server components
 */
export function ThemeToggleWrapper() {
  return <ThemeToggleStatic />;
}
