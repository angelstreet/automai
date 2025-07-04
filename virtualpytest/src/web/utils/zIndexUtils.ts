/**
 * Simple Z-Index Management - Order Based
 *
 * Components are listed in order from bottom to top.
 * Each component gets a z-index based on its position in the list.
 */

// Z-index order from bottom to top
// Each position gets 10 z-index points (index + 1) * 10
const Z_INDEX_ORDER = [
  'CONTENT', // 10
  'NAVIGATION_NODES', // 20
  'UI_ELEMENTS', // 30
  'READ_ONLY_INDICATOR', // 40
  'TOOLTIPS', // 50
  'NAVIGATION_PANELS', // 60
  'NAVIGATION_DIALOGS', // 70
  'NAVIGATION_CONFIRMATION', // 80
  'HEADER', // 90
  'HEADER_DROPDOWN', // 100
  'MODAL_BACKDROP', // 110
  'MODAL_CONTENT', // 120
  'STREAM_VIEWER', // 130
  'VERIFICATION_EDITOR', // 140
  'HDMI_STREAM', // 150
  'REMOTE_PANELS', // 160
  'ANDROID_MOBILE_OVERLAY', // 170
  'APPIUM_OVERLAY', // 180
  'NAVIGATION_GOTO_PANEL', // 190
  'NAVIGATION_SELECTION_PANEL', // 200
  'NAVIGATION_EDGE_PANEL', // 210
  'SCREENSHOT_MODAL', // 220
  'DEBUG_OVERLAY', // 230
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
