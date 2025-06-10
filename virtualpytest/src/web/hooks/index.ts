// Export all web hooks from organized structure

// Common Hooks (shared across domains)
export * from './common/useCapture';
export * from './common/useValidationColors';

// Page Hooks (domain-specific for pages)
export * from './pages/useScreenEditor';
export * from './pages/useNavigationEditor';  
export * from './pages/useNavigationHooks';
export * from './pages/useDeviceModels';
export * from './pages/useUserInterface';

// Feature Hooks (domain-specific features)
export * from './features/useControllerConfig';
export * from './features/useValidation';
export * from './features/useValidationUI';

// Remote Hooks
export * from './remote';

// Main controller hook
export { useControllers } from './useControllers'; 