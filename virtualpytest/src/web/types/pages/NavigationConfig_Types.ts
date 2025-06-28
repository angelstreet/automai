import { UINavigationNode, UINavigationEdge } from './Navigation_Types';

// =====================================================
// NAVIGATION CONFIG CONTEXT TYPES
// =====================================================

export interface NavigationConfigContextType {
  // Lock management
  isLocked: boolean;
  lockInfo: any;
  isCheckingLock: boolean;
  showReadOnlyOverlay: boolean;
  setCheckingLockState: (checking: boolean) => void;
  lockNavigationTree: (userInterfaceId: string) => Promise<boolean>;
  unlockNavigationTree: (userInterfaceId: string) => Promise<boolean>;
  checkTreeLockStatus: (userInterfaceId: string) => Promise<void>;
  setupAutoUnlock: (userInterfaceId: string) => () => void;

  // Config operations
  loadFromConfig: (userInterfaceId: string, state: NavigationConfigState) => Promise<void>;
  saveToConfig: (userInterfaceId: string, state: NavigationConfigState) => Promise<void>;
  listAvailableUserInterfaces: () => Promise<any[]>;
  createEmptyTree: (userInterfaceId: string, state: NavigationConfigState) => Promise<void>;

  // User identification
  sessionId: string;
  userId: string;
}

export interface NavigationConfigState {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  userInterface: any;
  setNodes: (nodes: UINavigationNode[]) => void;
  setEdges: (edges: UINavigationEdge[]) => void;
  setUserInterface: (ui: any) => void;
  setInitialState: (state: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface NavigationConfigProviderProps {
  children: React.ReactNode;
}

// =====================================================
// TREE LOCK MANAGEMENT TYPES
// =====================================================

export interface TreeLockInfo {
  session_id: string;
  user_id: string;
  locked_at: string;
  userinterface_id: string;
}

export interface LockStatusResponse {
  success: boolean;
  lock?: TreeLockInfo;
  error?: string;
}

export interface LockAcquireRequest {
  userinterface_id: string;
  session_id: string;
  user_id: string;
}

export interface LockReleaseRequest {
  userinterface_id: string;
  session_id: string;
  user_id: string;
}

// =====================================================
// TREE SAVE/LOAD TYPES
// =====================================================

export interface TreeSaveRequest {
  name: string;
  userinterface_id: string;
  tree_data: {
    nodes: UINavigationNode[];
    edges: UINavigationEdge[];
  };
  description: string;
  modification_type: 'create' | 'update';
  changes_summary: string;
}

export interface TreeLoadResponse {
  success: boolean;
  trees?: Array<{
    id: string;
    name: string;
    metadata: {
      nodes: UINavigationNode[];
      edges: UINavigationEdge[];
    };
  }>;
  error?: string;
}
