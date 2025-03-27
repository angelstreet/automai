import { ThemeToggle } from '@/components/shadcn/theme-toggle';

/**
 * Server component wrapper for ThemeToggle
 * This allows for better prerendering and suspense in server components
 */
export function ThemeToggleWrapper() {
  return <ThemeToggle />;
}