import { RemoteLayoutConfig } from './remotePanelLayout';

export interface AppiumRemoteConfig extends RemoteLayoutConfig {
  containerWidth: number;
  platformSupport: string[];
  automationFrameworks: string[];
  deviceCapabilities: {
    [platform: string]: {
      automationName: string;
      commonApps: Array<{
        identifier: string;
        label: string;
      }>;
      systemKeys: string[];
      [key: string]: any;
    };
  };
  uiConfig: {
    showPlatformIndicator: boolean;
    showConnectionStatus: boolean;
    showDeviceInfo: boolean;
    enableElementOverlay: boolean;
    enableCoordinateTap: boolean;
    enableAppLauncher: boolean;
    maxElementsDisplay: number;
    elementHighlightColors: string[];
    tapAnimationDuration: number;
  };
}

export const appiumRemoteConfig: AppiumRemoteConfig = {
  // Panel layout configuration
  panel_layout: {
    expanded: {
      width: '280px',
      height: '600px',
      position: {
        right: '20px',
        bottom: '20px',
      },
    },
    collapsed: {
      width: '180px',
      height: '300px',
      position: {
        right: '20px',
        bottom: '20px',
      },
    },
  },

  // Container configuration
  containerWidth: 250,

  // Platform support
  platformSupport: ['iOS', 'Android', 'Windows', 'macOS'],
  automationFrameworks: ['XCUITest', 'UIAutomator2', 'WinAppDriver', 'Mac2Driver'],

  // Device-specific capabilities
  deviceCapabilities: {
    ios: {
      automationName: 'XCUITest',
      usePrebuiltWDA: true,
      wdaLocalPort: 8100,
      supportsTouchId: true,
      supportsFaceId: true,
      commonApps: [
        { identifier: 'com.apple.Preferences', label: 'Settings' },
        { identifier: 'com.apple.mobilesafari', label: 'Safari' },
        { identifier: 'com.apple.mobilemail', label: 'Mail' },
        { identifier: 'com.apple.MobileSMS', label: 'Messages' },
        { identifier: 'com.apple.mobilephone', label: 'Phone' },
        { identifier: 'com.apple.camera', label: 'Camera' },
        { identifier: 'com.apple.mobilecal', label: 'Calendar' },
        { identifier: 'com.apple.Maps', label: 'Maps' },
      ],
      systemKeys: ['HOME', 'VOLUME_UP', 'VOLUME_DOWN', 'POWER', 'SCREENSHOT'],
    },
    android: {
      automationName: 'UIAutomator2',
      systemPort: 8200,
      supportsFingerprint: true,
      commonApps: [
        { identifier: 'com.android.settings', label: 'Settings' },
        { identifier: 'com.android.chrome', label: 'Chrome' },
        { identifier: 'com.android.dialer', label: 'Phone' },
        { identifier: 'com.android.mms', label: 'Messages' },
        { identifier: 'com.android.camera2', label: 'Camera' },
        { identifier: 'com.android.calendar', label: 'Calendar' },
        { identifier: 'com.google.android.apps.maps', label: 'Maps' },
      ],
      systemKeys: [
        'HOME',
        'BACK',
        'MENU',
        'VOLUME_UP',
        'VOLUME_DOWN',
        'POWER',
        'CAMERA',
        'CALL',
        'ENDCALL',
      ],
    },
    windows: {
      automationName: 'WinAppDriver',
      commonApps: [
        { identifier: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App', label: 'Calculator' },
        { identifier: 'Microsoft.WindowsNotepad_8wekyb3d8bbwe!App', label: 'Notepad' },
        { identifier: 'Microsoft.MicrosoftEdge_8wekyb3d8bbwe!MicrosoftEdge', label: 'Edge' },
      ],
      systemKeys: ['WIN', 'ALT_TAB', 'CTRL_C', 'CTRL_V'],
    },
    macos: {
      automationName: 'Mac2Driver',
      commonApps: [
        { identifier: 'com.apple.finder', label: 'Finder' },
        { identifier: 'com.apple.Safari', label: 'Safari' },
        { identifier: 'com.apple.TextEdit', label: 'TextEdit' },
        { identifier: 'com.apple.calculator', label: 'Calculator' },
      ],
      systemKeys: ['CMD', 'CMD_TAB', 'CMD_C', 'CMD_V'],
    },
  },

  // UI configuration
  uiConfig: {
    showPlatformIndicator: true,
    showConnectionStatus: true,
    showDeviceInfo: true,
    enableElementOverlay: true,
    enableCoordinateTap: true,
    enableAppLauncher: true,
    maxElementsDisplay: 100,
    elementHighlightColors: ['#FF0000', '#0066FF', '#FFD700', '#00CC00', '#9900FF'],
    tapAnimationDuration: 300,
  },
};

export default appiumRemoteConfig;
