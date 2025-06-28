// Navigation Contexts (clean unified architecture)
export { NavigationProvider, NavigationEditorProvider } from './navigation';

// Host Manager Context (simplified architecture - no more RegistrationContext)
export { HostManagerProvider } from './HostManagerProvider';
export { HostManagerContext } from './HostManagerContext';
export type { HostManagerContextType } from './HostManagerContext';
export { useHostManager } from '../hooks/useHostManager';

// Other Contexts
export { CustomThemeProvider as ThemeProvider, useTheme } from './ThemeContext';
export { ToastProvider, useToastContext as useToast } from './ToastContext';
