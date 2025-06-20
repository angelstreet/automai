/**
 * Remote Configuration Index
 * Exports all remote-related configurations and utilities
 */

// Export remote panel layout functions and interfaces
export * from './remotePanelLayout';

// Export individual remote configurations
export * from './androidTvRemote';
export * from './androidMobileRemote';
export * from './appiumRemote';
export * from './infraredRemote';
export * from './bluetoothRemote';

// Re-export for convenience
export {
  getConfigurableRemotePanelLayout,
  getConfigurableRemoteLayout,
  loadRemoteConfig,
  type ConfigurableRemotePanelLayout,
  type ConfigurableRemoteLayout,
} from './remotePanelLayout';
