// Export all web hooks from organized structure

// Core Hooks
export * from './useToast';

// Controller Hooks
export * from './controller';

// Validation Hooks
export * from './validation';

// Page Hooks (domain-specific for pages)
export * from './pages/useScreenEditor';
export * from './pages/useNavigationEditor';
export * from './pages/useDevice';
export * from './pages/useUserInterface';
export * from './pages/useRec';

export { useUserSession } from './useUserSession';
export { useToast } from './useToast';
export { useVerification } from './verification/useVerification';
export { useVerificationEditor } from './verification/useVerificationEditor';
export { useAction } from './actions/useAction';
export { useStreamCoordinates } from './useStreamCoordinates';
export { useReferences } from './useReferences';

// Navigation hooks
export { useNavigationActions } from './navigation/useNavigationActionsHook';
export { useNavigationEditor } from './navigation/useNavigationEditorHook';
export { useNavigationEditorNew } from './navigation/useNavigationEditorHookNew';
export { useNavigationPlayer } from './navigation/useNavigationPlayerHook';

// Component hooks
export { useLocalStorage } from './useLocalStorage';
export { useMediaQuery } from './useMediaQuery';
export { useTheme } from './useTheme';
export { useHostManager } from './useHostManager';

// Page hooks
export { useHome } from './pages/useHome';
export { useRec } from './pages/useRec';
