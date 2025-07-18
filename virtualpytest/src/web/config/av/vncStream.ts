import { HDMI_STREAM_HEADER_HEIGHT } from './hdmiStream';

export const vncStreamConfig = {
  stream_info: {
    name: 'VNC',
    type: 'vnc_stream' as const,
    default_quality: 'high' as const,
    supported_resolutions: ['1920x1080', '1280x720', '1024x768', '800x600'] as const,
    default_resolution: '1920x1080' as const,
  },
  panel_layout: {
    collapsed: {
      width: '350px',
      height: '240px', // Always landscape - VNC is desktop/host screen
      position: {
        bottom: '20px',
        left: '350px', // Offset from HDMI streams
      },
    },
    expanded: {
      width: '800px',
      height: '600px', // Always landscape - VNC is desktop/host screen
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    showControlsInCollapsed: false,
    showControlsInExpanded: true,
    header: {
      height: HDMI_STREAM_HEADER_HEIGHT,
      fontSize: '0.875rem',
      fontWeight: 'bold',
      iconSize: 'small',
      padding: '8px',
      backgroundColor: '#2A2A2A', // Slightly different from HDMI
      borderColor: '#444',
      textColor: '#ffffff',
    },
  },
  content_layout: {
    collapsed: {
      objectFit: 'contain' as const,
      width: '100%',
      height: 'auto',
    },
    expanded: {
      objectFit: 'contain' as const,
      width: '100%',
      height: 'auto',
    },
  },
} as const;

// VNC streams are always landscape (desktop/host screens) regardless of device type
// No mobile config needed - use the same config for all scenarios
export const vncStreamMobileConfig = vncStreamConfig;
