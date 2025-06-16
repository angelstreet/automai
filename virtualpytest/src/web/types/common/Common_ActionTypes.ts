/**
 * Action Types for Remote Controller Integration with Navigation Edges
 */

export type RemoteType = 'android_tv' | 'android_mobile' | 'infrared' | 'bluetooth';

// Base action interface
export interface BaseAction {
  type:
    | 'key_press'
    | 'input_text'
    | 'execute_sequence'
    | 'launch_app'
    | 'click_element'
    | 'coordinate_tap';
  description?: string;
  delay?: number; // milliseconds to wait after execution
}

// Key press action
export interface KeyPressAction extends BaseAction {
  type: 'key_press';
  key: string; // e.g., "RIGHT", "HOME", "BACK", "OK", "VOLUME_UP"
}

// Text input action
export interface TextInputAction extends BaseAction {
  type: 'input_text';
  text: string;
}

// App launch action (for mobile devices)
export interface AppLaunchAction extends BaseAction {
  type: 'launch_app';
  package: string; // Android package name
}

// Element click action (for mobile devices with UI dumping)
export interface ElementClickAction extends BaseAction {
  type: 'click_element';
  elementId?: string;
  text?: string; // Find by text
  resourceId?: string; // Find by resource ID
  contentDesc?: string; // Find by content description
}

// Coordinate tap action (for Android TV/Mobile)
export interface CoordinateTapAction extends BaseAction {
  type: 'coordinate_tap';
  x: number;
  y: number;
}

// Sequence action for complex navigation flows
export interface SequenceAction extends BaseAction {
  type: 'execute_sequence';
  sequence: NavigationAction[];
}

// Union type for all possible actions
export type NavigationAction =
  | KeyPressAction
  | TextInputAction
  | AppLaunchAction
  | ElementClickAction
  | CoordinateTapAction
  | SequenceAction;

// Edge action data structure
export interface EdgeActionData {
  // Primary action for forward navigation
  primaryAction: NavigationAction;
  // Optional return action (for back navigation)
  returnAction?: NavigationAction;
  // Controller requirements
  compatibleRemotes: RemoteType[];
  // Conditions for execution
  conditions?: {
    requiresScreenshot?: boolean;
    requiresUIElements?: boolean;
    minControllerVersion?: string;
  };
}

// Controller capabilities interface
export interface ControllerCapabilities {
  remoteType: RemoteType;
  supportedActions: BaseAction['type'][];
  supportedKeys: string[];
  features: {
    hasScreenshot: boolean;
    hasUIElementDumping: boolean;
    hasAppLaunching: boolean;
    hasCoordinateTapping: boolean;
    hasTextInput: boolean;
  };
  deviceInfo?: {
    name: string;
    version?: string;
    resolution?: { width: number; height: number };
  };
}

// Remote action execution result
export interface RemoteActionExecutionResult {
  success: boolean;
  error?: string;
  duration?: number; // milliseconds
  additionalData?: any; // For screenshot data, UI elements, etc.
}

// Common key mappings for different remote types
export const COMMON_KEYS = {
  // Navigation
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  OK: 'OK',
  SELECT: 'SELECT',

  // System
  HOME: 'HOME',
  BACK: 'BACK',
  MENU: 'MENU',
  POWER: 'POWER',

  // Media
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  STOP: 'STOP',

  // Volume
  VOLUME_UP: 'VOLUME_UP',
  VOLUME_DOWN: 'VOLUME_DOWN',
  MUTE: 'MUTE',

  // Numbers
  NUM_0: '0',
  NUM_1: '1',
  NUM_2: '2',
  NUM_3: '3',
  NUM_4: '4',
  NUM_5: '5',
  NUM_6: '6',
  NUM_7: '7',
  NUM_8: '8',
  NUM_9: '9',
} as const;

// Helper function to create common navigation actions
export const createNavigationAction = {
  keyPress: (key: string, description?: string): KeyPressAction => ({
    type: 'key_press',
    key,
    description,
  }),

  inputText: (text: string, description?: string): TextInputAction => ({
    type: 'input_text',
    text,
    description,
  }),

  launchApp: (packageName: string, description?: string): AppLaunchAction => ({
    type: 'launch_app',
    package: packageName,
    description,
  }),

  clickElement: (
    options: { elementId?: string; text?: string; resourceId?: string; contentDesc?: string },
    description?: string,
  ): ElementClickAction => ({
    type: 'click_element',
    ...options,
    description,
  }),

  tap: (x: number, y: number, description?: string): CoordinateTapAction => ({
    type: 'coordinate_tap',
    x,
    y,
    description,
  }),

  sequence: (actions: NavigationAction[], description?: string): SequenceAction => ({
    type: 'execute_sequence',
    sequence: actions,
    description,
  }),
};
