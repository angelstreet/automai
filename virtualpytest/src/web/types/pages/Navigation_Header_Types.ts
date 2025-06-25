import { Host } from '../common/Host_Types';

export interface NavigationEditorTreeControlsProps {
  focusNodeId: string | null;
  maxDisplayDepth: number;
  totalNodes: number;
  visibleNodes: number;
  availableFocusNodes: any[];
  onFocusNodeChange: (nodeId: string | null) => void;
  onDepthChange: (depth: number) => void;
  onResetFocus: () => void;
}

export interface NavigationEditorActionButtonsProps {
  treeId: string;
  isLocked: boolean;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;
  selectedHost: Host | null;
  selectedDeviceId: string | null;
  isControlActive: boolean;
  onAddNewNode: (nodeType: string, position: { x: number; y: number }) => void;
  onFitView: () => void;
  onSaveToConfig: () => void;
  onDiscardChanges: () => void;
}

export interface NavigationEditorDeviceControlsProps {
  selectedHost: Host | null;
  selectedDeviceId: string | null; // Device ID within the selected host
  isControlActive: boolean;
  isControlLoading: boolean;
  isRemotePanelOpen: boolean;
  availableHosts: Host[];
  isDeviceLocked: (deviceKey: string) => boolean; // Device-oriented locking: "hostname:device_id"
  onDeviceSelect: (host: Host | null, deviceId: string | null) => void;
  onTakeControl: () => Promise<void>;
  onToggleRemotePanel: () => void;
}
