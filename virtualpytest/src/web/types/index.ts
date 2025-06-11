// Export all types from organized structure

// Common types - Base types first, then specific types
export * from './common/Common_BaseTypes';
export * from './common/Common_ActionTypes';

// Specific common types (avoiding conflicts)
export type { 
  DeviceType, 
  DeviceEnvironment, 
  DeviceStatus,
  DeviceTypes,
  DeviceEnvironments,
  DeviceStatuses,
  // Runtime device types
  DeviceRegistration,
  DeviceWithProxies,
  ConnectedDevice,
  RegisteredHost,
  Host,
  DeviceConnection,
  DevicesResponse
} from './pages/Device_Types';

export type {
  ControllerImplementation,
  ControllerConfig,
  ControllerConfigMap
} from './controller/Controller_Types';

export * from './pages/Environment_Types';

// Page-specific types
export * from './pages/Navigation_Types';
export * from './pages/TestCase_Types';
export * from './pages/UserInterface_Types';
export * from './pages/Dashboard_Types';

// Feature-specific types - Remote types with explicit exports to avoid conflicts
export type { 
  AndroidElement, 
  AndroidApp, 
  RemoteConfig, 
  RemoteDeviceConfig,
  ConnectionForm, 
  RemoteSession, 
  AndroidTVSession, 
  AndroidMobileSession, 
  TestResult,
  RemoteType,
  BaseConnectionConfig,
  IRConnectionConfig,
  BluetoothConnectionConfig,
  AnyConnectionConfig,
  ControllerItem,
  ControllerTypesResponse
} from './controller/Remote_Types';

// Export the Remote ControllerTypes with alias to avoid conflict
export type { 
  ControllerTypes as RemoteControllerTypes,
  ControllerType as RemoteControllerType
} from './controller/Remote_Types';

export * from './features/Validation_Types'; 