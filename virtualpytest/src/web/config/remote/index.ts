/**
 * Remote Configuration Index
 * Exports all remote-related configurations and utilities
 */

// Export remote panel layout functions and interfaces
export * from './remotePanelLayout';

// Re-export for convenience
export {
  getConfigurableRemotePanelLayout,
  getConfigurableRemoteLayout,
  loadRemoteConfig,
  type ConfigurableRemotePanelLayout,
  type ConfigurableRemoteLayout,
} from './remotePanelLayout';
