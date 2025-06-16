export const hdmiStreamConfig = {
  stream_info: {
    name: 'HDMI Stream',
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
      width: '800px',
      height: '600px',
      position: {
        top: '100px',
        left: '20px',
      },
    },
    zIndex: 1000,
    showControlsInCollapsed: false,
    showControlsInExpanded: true,
  },
  device_specific: {
    android_mobile: {
      collapsed: {
        width: '300px',
        height: '600px',
      },
    },
    android_tv: {
      collapsed: {
        width: '400px',
        height: '300px',
      },
    },
  },
} as const;

// Mobile-specific HDMI Stream configuration (portrait orientation)
export const hdmiStreamMobileConfig = {
  stream_info: {
    name: 'HDMI Stream Mobile',
    type: 'hdmi_stream' as const,
    default_quality: 'high' as const,
    supported_resolutions: ['1920x1080', '1280x720', '640x480'] as const,
    default_resolution: '1920x1080' as const,
  },
  panel_layout: {
    collapsed: {
      width: '200px',
      height: '350px', // Portrait - taller than wide
      position: {
        bottom: '20px',
        left: '20px',
      },
    },
    expanded: {
      width: '400px',
      height: '700px', // Portrait - taller than wide
      position: {
        top: '100px',
        left: '20px',
      },
    },
    zIndex: 1000,
    showControlsInCollapsed: false,
    showControlsInExpanded: true,
  },
  device_specific: {
    android_mobile: {
      collapsed: {
        width: '200px',
        height: '350px',
      },
      expanded: {
        width: '400px',
        height: '700px',
      },
    },
  },
} as const;

export type HdmiStreamConfig = typeof hdmiStreamConfig;
export type HdmiStreamMobileConfig = typeof hdmiStreamMobileConfig;
