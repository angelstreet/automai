// Export all types from organized structure

// Common types (including devices, controllers, and environments)
export * from './common/Common_BaseTypes';
export * from './common/Device_Types';
export * from './common/Controller_Types';
export * from './common/Environment_Types';

// Page-specific types
export * from './pages/Navigation_Types';
export * from './pages/TestCase_Types';
export * from './pages/UserInterface_Types';

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
export * from './features/Remote_Types';

// Feature-specific types
export * from './features/Validation_Types'; 