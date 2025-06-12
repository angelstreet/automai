// Export all types from organized structure

// Common types - Base types first, then specific types
export * from './common/Common_BaseTypes';
export * from './common/Common_ActionTypes';

// Host types
export type { 
  Host,
  HostRegistrationPayload,
  HostStatus,
  HostStatusType
} from './common/Host_Types';

export type {
  ControllerImplementation,
  ControllerConfig,
  ControllerConfigMap
} from './controller/Controller_Types';

export * from './pages/Environment_Types';

// Page-specific types
export * from './pages/Navigation_Types';
export * from './pages/TestCase_Types';

// Export UserInterface types 
export type {
  UserInterface,
  UserInterfaceCreatePayload,
  ScreenDefinitionEditorProps,
  ScreenViewMode,
  StreamStatus,
  LayoutConfig,
  DeviceResolution,
  ResolutionInfo,
  SelectedArea,
  CaptureImageState,
  ScreenEditorState,
  ScreenEditorActions,
  RecordingTimerProps,
  OverlayProps
} from './pages/UserInterface_Types';

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