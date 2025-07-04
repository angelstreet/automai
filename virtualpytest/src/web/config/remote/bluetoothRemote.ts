export const bluetoothRemoteConfig = {
  remote_info: {
    name: 'Bluetooth Remote',
    type: 'bluetooth_remote' as const,
  },
  panel_layout: {
    collapsed: {
      width: '200px',
      height: '250px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    expanded: {
      width: '350px',
      height: '450px',
      position: {
        top: '100px',
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
      width: '160px',
      height: '210px',
      scale: 0.8,
      padding: '20px',
    },
    expanded: {
      width: '300px',
      height: '400px',
      scale: 1.0,
      padding: '25px',
    },
    background_image: {
      url: '/bluetooth-remote.png',
      width: 300,
      height: 400,
    },
    global_offset: {
      x: 0,
      y: 0,
    },
  },
  button_layout: {
    power: {
      key: 'POWER',
      position: { x: 75, y: 50 },
      size: { width: 35, height: 25 },
      shape: 'rectangle' as const,
      comment: 'Power button',
    },
    pair: {
      key: 'PAIR',
      position: { x: 125, y: 50 },
      size: { width: 35, height: 25 },
      shape: 'rectangle' as const,
      comment: 'Bluetooth pair button',
    },
    up: {
      key: 'DPAD_UP',
      position: { x: 100, y: 100 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'D-pad up',
    },
    down: {
      key: 'DPAD_DOWN',
      position: { x: 100, y: 140 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'D-pad down',
    },
    left: {
      key: 'DPAD_LEFT',
      position: { x: 70, y: 120 },
      size: { width: 20, height: 30 },
      shape: 'rectangle' as const,
      comment: 'D-pad left',
    },
    right: {
      key: 'DPAD_RIGHT',
      position: { x: 140, y: 120 },
      size: { width: 20, height: 30 },
      shape: 'rectangle' as const,
      comment: 'D-pad right',
    },
    center: {
      key: 'DPAD_CENTER',
      position: { x: 100, y: 120 },
      size: { width: 25, height: 25 },
      shape: 'circle' as const,
      comment: 'D-pad center/OK',
    },
    volume_up: {
      key: 'VOLUME_UP',
      position: { x: 50, y: 180 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Volume up',
    },
    volume_down: {
      key: 'VOLUME_DOWN',
      position: { x: 90, y: 180 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Volume down',
    },
    mute: {
      key: 'VOLUME_MUTE',
      position: { x: 130, y: 180 },
      size: { width: 30, height: 20 },
      shape: 'rectangle' as const,
      comment: 'Mute button',
    },
  },
} as const;

export type BluetoothRemoteConfig = typeof bluetoothRemoteConfig;
