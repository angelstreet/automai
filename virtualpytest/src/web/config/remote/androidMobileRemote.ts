import { getZIndex } from '../../utils/zIndexUtils';

export const androidMobileRemoteConfig = {
  remote_info: {
    name: 'Android Mobile',
    type: 'android_mobile' as const,
  },
  panel_layout: {
    collapsed: {
      width: '240px',
      height: '380px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    expanded: {
      width: '280px',
      height: '520px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    showScreenshotInCollapsed: false,
    showScreenshotInExpanded: false,
    header: {
      height: '48px',
      fontSize: '0.875rem',
      fontWeight: 'bold',
      iconSize: 'small',
      padding: '8px',
      backgroundColor: '#1E1E1E',
      borderColor: '#333',
      textColor: '#ffffff',
    },
  },
  remote_layout: {
    collapsed: {
      width: '180px',
      height: '280px',
      scale: 0.8,
      padding: '20px',
    },
    expanded: {
      width: '350px',
      height: '500px',
      scale: 1.0,
      padding: '35px',
    },
    background_image: {
      url: '/android-mobile-remote.png',
      width: 350,
      height: 500,
    },
    global_offset: {
      x: 0,
      y: 0,
    },
  },
  button_layout: {
    back: {
      key: 'BACK',
      position: { x: 40, y: 220 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Back button',
    },
    home: {
      key: 'HOME',
      position: { x: 90, y: 220 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Home button',
    },
    menu: {
      key: 'MENU',
      position: { x: 140, y: 220 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Menu button',
    },
    camera: {
      key: 'CAMERA',
      position: { x: 40, y: 260 },
      size: { width: 25, height: 25 },
      shape: 'circle' as const,
      comment: 'Camera button',
    },
    call: {
      key: 'CALL',
      position: { x: 90, y: 260 },
      size: { width: 25, height: 25 },
      shape: 'circle' as const,
      comment: 'Call button',
    },
    endcall: {
      key: 'ENDCALL',
      position: { x: 140, y: 260 },
      size: { width: 25, height: 25 },
      shape: 'circle' as const,
      comment: 'End call button',
    },
    volume_down: {
      key: 'VOLUME_DOWN',
      position: { x: 30, y: 300 },
      size: { width: 25, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Volume down',
    },
    volume_mute: {
      key: 'VOLUME_MUTE',
      position: { x: 70, y: 300 },
      size: { width: 25, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Volume mute',
    },
    volume_up: {
      key: 'VOLUME_UP',
      position: { x: 110, y: 300 },
      size: { width: 25, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Volume up',
    },
    power: {
      key: 'POWER',
      position: { x: 150, y: 300 },
      size: { width: 25, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Power button',
    },
  },
} as const;

export type AndroidMobileRemoteConfig = typeof androidMobileRemoteConfig;
