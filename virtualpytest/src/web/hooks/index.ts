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

export { useDeviceControl } from './useDeviceControl';
export { useUserSession } from './useUserSession';
export { useToast } from './useToast';
export { useRegistration } from './useRegistration';
export { useVerification } from './verification/useVerification';
export { useVerificationEditor } from './verification/useVerificationEditor';
export { useStreamCoordinates } from './useStreamCoordinates';
