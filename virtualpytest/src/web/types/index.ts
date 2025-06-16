// Export all types from organized structure

// Common types - Base types first, then specific types
export * from './common/Common_BaseTypes';

// Export specific types from Common_ActionTypes to avoid conflicts with Navigation_Types
export type {
  RemoteType,
  BaseAction,
  KeyPressAction,
  TextInputAction,
  AppLaunchAction,
  ElementClickAction,
  CoordinateTapAction,
  SequenceAction,
  NavigationAction,
  EdgeActionData,
  ControllerCapabilities,
  RemoteActionExecutionResult,
  COMMON_KEYS,
  createNavigationAction,
} from './common/Common_ActionTypes';

// Host types
export type {
  Host,
  HostRegistrationPayload,
  HostStatus,
  HostStatusType,
} from './common/Host_Types';

export type {
  ControllerImplementation,
  ControllerConfig,
  ControllerConfigMap,
} from './controller/Controller_Types';

export * from './pages/Environment_Types';

// Page-specific types (Navigation_Types includes its own ActionExecutionResult)
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
  OverlayProps,
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
  RemoteType as RemoteControllerType,
  BaseConnectionConfig,
  AndroidConnectionConfig,
  IRConnectionConfig,
  BluetoothConnectionConfig,
  AnyConnectionConfig,
  ControllerItem,
  ControllerTypesResponse,
} from './controller/Remote_Types';

// Export the Remote ControllerTypes with alias to avoid conflict
export type {
  ControllerTypes as RemoteControllerTypes,
  ControllerType as RemoteControllerTypeAlias,
} from './controller/Remote_Types';

// Panel types for dynamic panel state management
export type {
  PanelInfo,
  PanelDimensions,
  PanelContentArea,
  PanelState,
  PanelLayoutConfig,
  PanelAwareProps,
  PanelManagerProps,
} from './controller/Panel_Types';

export * from './features/Validation_Types';
