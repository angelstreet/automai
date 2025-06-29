export interface ScreenDefinitionEditorProps {
  /** Complete host object containing all configuration */
  selectedHost?: any;
  /** Selected device ID within the host */
  selectedDeviceId?: string | null;
  /** Whether to auto-connect when device is selected */
  autoConnect?: boolean;
  /** Callback when disconnection is complete */
  onDisconnectComplete?: () => void;
  /** Custom styling */
  sx?: any;
}

export type ScreenViewMode = 'stream' | 'screenshot' | 'capture';
export type StreamStatus = 'running' | 'stopped' | 'unknown';

export interface LayoutConfig {
  minHeight: string;
  aspectRatio: string;
  objectFit: 'cover';
  isMobileModel: boolean;
}

export interface DeviceResolution {
  width: number;
  height: number;
}

export interface ResolutionInfo {
  device: { width: number; height: number } | null;
  capture: string | null;
  stream: string | null;
}

export interface SelectedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureImageState {
  ref?: React.RefObject<HTMLImageElement>;
  dimensions?: { width: number; height: number };
  sourcePath?: string;
}

export interface ScreenEditorState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  streamStatus: StreamStatus;
  streamUrl: string | undefined;

  // Capture state
  lastScreenshotPath: string | undefined;
  currentFrame: number;
  viewMode: ScreenViewMode;
  isCapturing: boolean;
  isStoppingCapture: boolean;
  captureStartTime: Date | null;
  captureEndTime: Date | null;

  // UI state
  isExpanded: boolean;
  isScreenshotLoading: boolean;

  // Selection state
  selectedArea: SelectedArea | null;

  // Resolution state
  resolutionInfo: ResolutionInfo;
}

export interface ScreenEditorActions {
  handleStartCapture: () => Promise<void>;
  handleStopCapture: () => Promise<void>;
  handleTakeScreenshot: () => Promise<void>;
  restartStream: () => Promise<void>;
  handleToggleExpanded: () => void;
  handleFrameChange: (frame: number) => void;
  handleBackToStream: () => void;
  handleAreaSelected: (area: SelectedArea) => void;
  handleClearSelection: () => void;
  handleTap: (x: number, y: number) => Promise<void>;
  getStreamUrl: () => Promise<string | undefined>;
}

export interface RecordingTimerProps {
  isCapturing: boolean;
}

export interface OverlayProps {
  isCapturing?: boolean;
  isScreenshotLoading?: boolean;
  streamStatus?: StreamStatus;
  recordingTime?: number;
}

// User Interface Types
export interface UserInterface {
  id: string;
  name: string;
  models: string[];
  min_version: string;
  max_version: string;
  created_at: string;
  updated_at: string;
  root_tree?: {
    id: string;
    name: string;
  } | null;
}

export interface UserInterfaceCreatePayload {
  name: string;
  models: string[];
  min_version?: string;
  max_version?: string;
}

export interface ApiResponse<T> {
  status: string;
  userinterface?: T;
  error?: string;
}
