// Export all types from organized structure

// Common types (excluding ControllerType to avoid conflict)
export * from './common/Common_BaseTypes';

// Page-specific types
export * from './pages/Navigation_Types';
export * from './pages/TestCaseTypes';
export type { Device, Controller, EnvironmentProfile } from './pages/DeviceTypes';

// Remote types (with explicit ControllerType export)
export type { 
  AndroidElement, 
  AndroidApp, 
  RemoteConfig, 
  ControllerType,
  ConnectionForm, 
  RemoteSession, 
  AndroidTVSession, 
  AndroidMobileSession, 
  TestResult 
} from './remote/types';
export * from './remote/remoteTypes'; 