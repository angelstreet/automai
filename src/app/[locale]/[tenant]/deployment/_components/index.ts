// src/app/[locale]/[tenant]/deployment/_components/index.ts

// Server components
export { default as DeploymentList } from './DeploymentList';
export { default as DeploymentContent } from './DeploymentContent';
export { default as DeploymentSkeleton } from './DeploymentSkeleton';
export { default as DeploymentWizardContainer } from './DeploymentWizardContainer';

// UI components (may be used by both server and client components)
export { default as StatusBadge } from './StatusBadge';
export { default as HostSelector } from './HostSelector';
export { default as EnhancedScriptSelector } from './EnhancedScriptSelector';
export { default as CustomSwitch } from './CustomSwitch';
export { default as DeploymentWizardStep1 } from './DeploymentWizardStep1';
export { default as DeploymentWizardStep2 } from './DeploymentWizardStep2';
export { default as DeploymentWizardStep3 } from './DeploymentWizardStep3';
export { default as DeploymentWizardStep4 } from './DeploymentWizardStep4';

// Re-export client components
export * from './client';
