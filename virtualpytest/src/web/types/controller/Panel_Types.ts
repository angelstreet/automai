/**
 * Panel Types
 *
 * Types for managing dynamic panel states, positioning, and overlay integration
 * for remote controller panels that can be collapsed or expanded.
 */

// Panel state and positioning information
export interface PanelInfo {
  position: { x: number; y: number };
  size: { width: number; height: number };
  deviceResolution: { width: number; height: number };
  isCollapsed: boolean;
}

// Panel dimensions for both states
export interface PanelDimensions {
  collapsed: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
  expanded: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
}

// Panel content area configuration
export interface PanelContentArea {
  collapsed: {
    offset: { x: number; y: number };
    contentSize: { width: number; height: number };
  };
  expanded: {
    offset: { x: number; y: number };
    contentSize: { width: number; height: number };
  };
}

// Panel state management
export interface PanelState {
  isCollapsed: boolean;
  isMinimized: boolean;
  isVisible: boolean;
}

// Panel configuration from remote config
export interface PanelLayoutConfig {
  collapsed: {
    width: string;
    height: string;
    position: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
  expanded: {
    width: string;
    height: string;
    position: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
  zIndex: number;
  showScreenshotInCollapsed: boolean;
  showScreenshotInExpanded: boolean;
  header?: {
    height: string;
    fontSize: string;
    fontWeight: string;
    iconSize: string;
    padding: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
}

// Props for components that need panel information
export interface PanelAwareProps {
  panelInfo?: PanelInfo;
  onPanelTap?: (x: number, y: number) => Promise<void>;
}

// Props for components that manage panel state
export interface PanelManagerProps {
  collapsedPosition?: { x: number; y: number };
  collapsedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  expandedSize?: { width: number; height: number };
  deviceResolution?: { width: number; height: number };
}
