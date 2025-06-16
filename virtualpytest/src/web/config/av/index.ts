/**
 * AV Configuration Index
 * Exports all AV-related configurations and utilities
 */

// Export AV panel layout functions and interfaces
export * from './avPanelLayout';

// Re-export for convenience
export {
  getConfigurableAVPanelLayout,
  loadAVConfig,
  type ConfigurableAVPanelLayout,
} from './avPanelLayout';
