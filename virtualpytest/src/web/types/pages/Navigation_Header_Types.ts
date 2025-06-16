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
  selectedDevice: string | null;
  isControlActive: boolean;
  onAddNewNode: () => void;
  onFitView: () => void;
  onSaveToConfig: () => void;
  onDiscardChanges: () => void;
}

export interface NavigationEditorDeviceControlsProps {
  selectedDevice: string | null;
  isControlActive: boolean;
  isControlLoading: boolean;
  isRemotePanelOpen: boolean;
  availableHosts: Host[];
  isDeviceLocked: (hostName: string) => boolean;
  onDeviceSelect: (device: string | null) => void;
  onTakeControl: () => Promise<void>;
  onToggleRemotePanel: () => void;
}
