// Export all web hooks from organized structure

// Controller Hooks
export * from './controller';

// Validation Hooks
export * from './validation';

// Verification Hooks
export * from './verification';

// Common Hooks (shared across domains)
export * from './common/useCapture';

// Page Hooks (domain-specific for pages)
export * from './pages/useScreenEditor';
export * from './pages/useNavigationEditor';  
export * from './pages/useNavigationHooks';
export * from './pages/useDeviceModels';
export * from './pages/useUserInterface';

// Remote Hooks
export * from './remote';

// Main controller hook
export { useControllers } from './useControllers'; 