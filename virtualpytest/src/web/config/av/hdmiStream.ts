// Shared constants for HDMI Stream configuration
export const HDMI_STREAM_HEADER_HEIGHT = '40px';

export const hdmiStreamConfig = {
  stream_info: {
    name: 'HDMI',
    type: 'hdmi_stream' as const,
    default_quality: 'high' as const,
    supported_resolutions: ['1920x1080', '1280x720', '640x480'] as const,
    default_resolution: '1920x1080' as const,
  },
  panel_layout: {
    collapsed: {
      width: '300px',
      height: '200px',
      position: {
        bottom: '20px',
        left: '20px',
      },
    },
    expanded: {
      width: '700px',
      height: '600px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    zIndex: 1000,
    showControlsInCollapsed: false,
    showControlsInExpanded: true,
    header: {
      height: HDMI_STREAM_HEADER_HEIGHT,
      fontSize: '0.875rem',
      fontWeight: 'bold',
      iconSize: 'small',
      padding: '8px',
      backgroundColor: '#1E1E1E',
      borderColor: '#333',
      textColor: '#ffffff',
    },
  },
} as const;

// Mobile-specific HDMI Stream configuration (portrait orientation)
export const hdmiStreamMobileConfig = {
  stream_info: {
    name: 'HDMI',
    type: 'hdmi_stream' as const,
    default_quality: 'high' as const,
    supported_resolutions: ['1920x1080', '1280x720', '640x480'] as const,
    default_resolution: '1920x1080' as const,
  },
  panel_layout: {
    collapsed: {
      width: '240px',
      height: '380px', // Portrait - taller than wide
      position: {
        bottom: '20px',
        left: '20px',
      },
    },
    expanded: {
      width: '340px',
      height: '600px', // Portrait - taller than wide
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    zIndex: 1000,
    showControlsInCollapsed: false,
    showControlsInExpanded: true,
    header: {
      height: HDMI_STREAM_HEADER_HEIGHT,
      fontSize: '0.875rem',
      fontWeight: 'bold',
      iconSize: 'small',
      padding: '6px',
      backgroundColor: '#1E1E1E',
      borderColor: '#333',
      textColor: '#ffffff',
    },
  },
} as const;

export type HdmiStreamConfig = typeof hdmiStreamConfig;
export type HdmiStreamMobileConfig = typeof hdmiStreamMobileConfig;
