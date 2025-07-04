/**
 * Simple Z-Index Management - Order Based
 *
 * Components are listed in order from bottom to top.
 * Each component gets a z-index based on its position in the list.
 */

// Define component order from bottom (0) to top
const Z_INDEX_ORDER = [
  // Base content
  'CONTENT',

  // Navigation nodes and basic UI
  'NAVIGATION_NODES',
  'UI_ELEMENTS',

  // Overlays and indicators
  'READ_ONLY_INDICATOR',
  'TOOLTIPS',

  // Navigation panels
  'NAVIGATION_PANELS',
  'NAVIGATION_GOTO_PANEL',
  'NAVIGATION_SELECTION_PANEL',
  'NAVIGATION_EDGE_PANEL',

  // Navigation dialogs
  'NAVIGATION_DIALOGS',
  'NAVIGATION_CONFIRMATION',

  // Header (must be above navigation)
  'HEADER',
  'HEADER_DROPDOWN',

  // Modals and streams
  'MODAL_BACKDROP',
  'MODAL_CONTENT',
  'STREAM_VIEWER',
  'VERIFICATION_EDITOR',
  'HDMI_STREAM',

  // Remote control panels - ON TOP of modals and streams
  'REMOTE_PANELS',
  'ANDROID_MOBILE_OVERLAY',
  'APPIUM_OVERLAY',

  // Screenshot and debug overlays - highest priority
  'SCREENSHOT_MODAL',

  // Emergency/Debug
  'DEBUG_OVERLAY',
] as const;

type ZIndexComponent = (typeof Z_INDEX_ORDER)[number];

/**
 * Get z-index for a component based on its order
 * Each position gets 10 z-index points to allow for micro-adjustments
 */
export const getZIndex = (component: ZIndexComponent, offset: number = 0): number => {
  const index = Z_INDEX_ORDER.indexOf(component);
  if (index === -1) {
    console.warn(`Unknown z-index component: ${component}`);
    return 1;
  }
  return (index + 1) * 10 + offset;
};

/**
 * Get z-index style object for React components
 */
export const getZIndexStyle = (component: ZIndexComponent, offset: number = 0) => ({
  zIndex: getZIndex(component, offset),
});

/**
 * Get all z-index values (for debugging)
 */
export const getAllZIndexes = (): Record<ZIndexComponent, number> => {
  const result = {} as Record<ZIndexComponent, number>;
  Z_INDEX_ORDER.forEach((component) => {
    result[component] = getZIndex(component);
  });
  return result;
};

// Export the type for TypeScript
export type { ZIndexComponent };
