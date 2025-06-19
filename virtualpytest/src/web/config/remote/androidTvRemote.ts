export const androidTvRemoteConfig = {
  remote_info: {
    name: 'Android TV',
    type: 'android_tv' as const,
  },
  panel_layout: {
    collapsed: {
      width: '160px',
      height: '300px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    expanded: {
      width: '240px',
      height: '600px',
      position: {
        top: '100px',
        right: '20px',
      },
    },
    zIndex: 1000,
    showScreenshotInCollapsed: false,
    showScreenshotInExpanded: true,
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
      width: '250px',
      height: '150px',
      scale: 0.6,
      padding: '25px',
    },
    expanded: {
      width: '400px',
      height: '300px',
      scale: 1.0,
      padding: '50px',
    },
    background_image: {
      url: '/android-tv-remote.png',
      width: 400,
      height: 300,
    },
    global_offset: {
      x: 0,
      y: 0,
    },
  },
  button_layout: {
    power: {
      key: 'POWER',
      position: { x: 20, y: 20 },
      size: { width: 40, height: 25 },
      shape: 'rectangle' as const,
      comment: 'Power button',
    },
    home: {
      key: 'HOME',
      position: { x: 120, y: 50 },
      size: { width: 40, height: 25 },
      shape: 'rectangle' as const,
      comment: 'Home button',
    },
    back: {
      key: 'BACK',
      position: { x: 190, y: 50 },
      size: { width: 40, height: 25 },
      shape: 'rectangle' as const,
      comment: 'Back button',
    },
    up: {
      key: 'DPAD_UP',
      position: { x: 120, y: 100 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'D-pad up',
    },
    down: {
      key: 'DPAD_DOWN',
      position: { x: 120, y: 140 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'D-pad down',
    },
    left: {
      key: 'DPAD_LEFT',
      position: { x: 90, y: 120 },
      size: { width: 20, height: 30 },
      shape: 'rectangle' as const,
      comment: 'D-pad left',
    },
    right: {
      key: 'DPAD_RIGHT',
      position: { x: 160, y: 120 },
      size: { width: 20, height: 30 },
      shape: 'rectangle' as const,
      comment: 'D-pad right',
    },
    center: {
      key: 'DPAD_CENTER',
      position: { x: 120, y: 120 },
      size: { width: 25, height: 25 },
      shape: 'circle' as const,
      comment: 'D-pad center/OK',
    },
    volume_up: {
      key: 'VOLUME_UP',
      position: { x: 50, y: 180 },
      size: { width: 35, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Volume up',
    },
    volume_down: {
      key: 'VOLUME_DOWN',
      position: { x: 100, y: 180 },
      size: { width: 35, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Volume down',
    },
    menu: {
      key: 'MENU',
      position: { x: 150, y: 180 },
      size: { width: 35, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Menu button',
    },
  },
} as const;

export type AndroidTvRemoteConfig = typeof androidTvRemoteConfig;
