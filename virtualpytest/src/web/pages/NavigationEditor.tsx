import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls, 
  ReactFlowProvider,
  MiniMap,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant,
  Handle,
  Position,
  getBezierPath,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  useReactFlow,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Snackbar,
  Alert,
  Container,
  Typography,
  Button,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

// Import extracted components and hooks
import { useNavigationEditor } from '../hooks/useNavigationEditor';
import { UINavigationNode } from '../components/navigation/UINavigationNode';
import { UIMenuNode } from '../components/navigation/UIMenuNode';
import { UINavigationEdge } from '../components/navigation/UINavigationEdge';
import { NodeEditDialog } from '../components/navigation/NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/EdgeEditDialog';
import { EdgeSelectionPanel } from '../components/navigation/EdgeSelectionPanel';
import { NodeSelectionPanel } from '../components/navigation/NodeSelectionPanel';
import { NavigationEditorHeader } from '../components/navigation/NavigationEditorHeader';
import { VerificationResultsDisplay } from '../components/verification/VerificationResultsDisplay';

// Import NEW generic remote components instead of device-specific ones
import { CompactRemote } from '../components/remote/CompactRemote';
import { CompactAndroidMobile } from '../components/remote/CompactAndroidMobile';
import { RemotePanel } from '../components/remote/RemotePanel';

// Import ScreenDefinitionEditor
import { ScreenDefinitionEditor } from '../components/user-interface/ScreenDefinitionEditor';

// Import device utilities
import { getDeviceRemoteConfig, extractConnectionConfigForAndroid, extractConnectionConfigForIR, extractConnectionConfigForBluetooth } from '../utils/deviceRemoteMapping';
import { deviceApi, Device } from '../services/deviceService';

// Import the hook to access SSH session state
import { useRemoteConnection } from '../hooks/remote/useRemoteConnection';

// Import the useValidationColors hook
import { useValidationColors } from '../hooks/useValidationColors';

// Local interface for verification test results including ADB fields
interface VerificationTestResult {
  success: boolean;
  message?: string;
  error?: string;
  threshold?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  sourceImageUrl?: string;
  referenceImageUrl?: string;
  extractedText?: string;
  searchedText?: string;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  detectedLanguage?: string;
  languageConfidence?: number;
  ocrConfidence?: number;
  // ADB-specific result data
  search_term?: string;
  wait_time?: number;
  total_matches?: number;
  matches?: Array<{
    element_id: number;
    matched_attribute: string;
    matched_value: string;
    match_reason: string;
    search_term: string;
    case_match: string;
    all_matches: Array<{
      attribute: string;
      value: string;
      reason: string;
    }>;
    full_element: {
      id: number;
      text: string;
      resourceId: string;
      contentDesc: string;
      className: string;
      bounds: string;
      clickable: boolean;
      enabled: boolean;
      tag?: string;
    };
  }>;
}

// Node types for React Flow
const nodeTypes = {
  uiScreen: UINavigationNode,
  uiMenu: UIMenuNode,
};

const edgeTypes = {
  uiNavigation: UINavigationEdge,
  smoothstep: UINavigationEdge,
};

// SSH Session State Tracker Component for Android Mobile
interface SSHSessionTrackerProps {
  connectionConfig?: any;
  autoConnect?: boolean;
  onDisconnectComplete?: () => void;
  onSessionStateChange?: (session: { connected: boolean; connectionLoading: boolean; connectionError: string | null }) => void;
  sx?: any;
}

function CompactAndroidMobileWithSessionTracking({
  connectionConfig,
  autoConnect,
  onDisconnectComplete,
  onSessionStateChange,
  sx
}: SSHSessionTrackerProps) {
  const { session, connectionLoading, connectionError } = useRemoteConnection('android-mobile');
  
  // Update parent component when SSH session state changes
  useEffect(() => {
    if (onSessionStateChange) {
      onSessionStateChange({
        connected: session.connected,
        connectionLoading: connectionLoading,
        connectionError: connectionError,
      });
    }
  }, [session.connected, connectionLoading, connectionError, onSessionStateChange]);
  
  return (
    <CompactAndroidMobile
      connectionConfig={connectionConfig}
      autoConnect={autoConnect}
      onDisconnectComplete={onDisconnectComplete}
      sx={sx}
    />
  );
}

// SSH Session State Tracker Component for Generic Remote
interface CompactRemoteWithSessionTrackingProps {
  remoteType: 'android-tv' | 'ir' | 'bluetooth';
  connectionConfig?: any;
  autoConnect?: boolean;
  showScreenshot?: boolean;
  onDisconnectComplete?: () => void;
  onSessionStateChange?: (session: { connected: boolean; connectionLoading: boolean; connectionError: string | null }) => void;
  sx?: any;
}

function CompactRemoteWithSessionTracking({
  remoteType,
  connectionConfig,
  autoConnect,
  showScreenshot = false,
  onDisconnectComplete,
  onSessionStateChange,
  sx
}: CompactRemoteWithSessionTrackingProps) {
  const { session, connectionLoading, connectionError } = useRemoteConnection(remoteType);
  
  // Update parent component when SSH session state changes
  useEffect(() => {
    if (onSessionStateChange) {
      onSessionStateChange({
        connected: session.connected,
        connectionLoading: connectionLoading,
        connectionError: connectionError,
      });
    }
  }, [session.connected, connectionLoading, connectionError, onSessionStateChange]);
  
  return (
    <CompactRemote
      remoteType={remoteType}
      connectionConfig={connectionConfig}
      autoConnect={autoConnect}
      showScreenshot={showScreenshot}
      onDisconnectComplete={onDisconnectComplete}
      sx={sx}
    />
  );
}

const NavigationEditorContent: React.FC = () => {
  // Basic remote control state
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isControlActive, setIsControlActive] = useState(false);
  
  // SSH session state for coordination between remote panel and screen definition editor
  const [sshSession, setSSHSession] = useState<{
    connected: boolean;
    connectionLoading: boolean;
    connectionError: string | null;
  }>({
    connected: false,
    connectionLoading: false,
    connectionError: null,
  });

  // Verification state
  const [isVerificationActive, setIsVerificationActive] = useState(false);
  const [verificationControllerStatus, setVerificationControllerStatus] = useState<{
    image_controller_available: boolean;
    text_controller_available: boolean;
  }>({
    image_controller_available: false,
    text_controller_available: false,
  });
  
  // Add verification results state 
  const [verificationResults, setVerificationResults] = useState<any[]>([]);
  const [verificationPassCondition, setVerificationPassCondition] = useState<'all' | 'any'>('all');
  const [lastVerifiedNodeId, setLastVerifiedNodeId] = useState<string | null>(null);

  // Device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  // Memoize computed values to prevent re-renders
  const selectedDeviceData = useMemo(() => {
    return devices.find(d => d.name === selectedDevice) || null;
  }, [devices, selectedDevice]);

  const remoteConfig = useMemo(() => {
    return selectedDeviceData ? getDeviceRemoteConfig(selectedDeviceData) : null;
  }, [selectedDeviceData]);
  
  const hasAVCapabilities = useMemo(() => {
    return selectedDeviceData?.controller_configs?.av?.parameters != null;
  }, [selectedDeviceData]);

  // Memoize connection configs to prevent object recreation
  const androidConnectionConfig = useMemo(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return null;
    return extractConnectionConfigForAndroid(selectedDeviceData.controller_configs.remote);
  }, [selectedDeviceData?.controller_configs?.remote]);

  const irConnectionConfig = useMemo(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return null;
    return extractConnectionConfigForIR(selectedDeviceData.controller_configs.remote);
  }, [selectedDeviceData?.controller_configs?.remote]);

  const bluetoothConnectionConfig = useMemo(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return null;
    return extractConnectionConfigForBluetooth(selectedDeviceData.controller_configs.remote);
  }, [selectedDeviceData?.controller_configs?.remote]);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    console.log('[@component:NavigationEditor] Fetching devices');
    try {
      setDevicesLoading(true);
      const fetchedDevices = await deviceApi.getAllDevices();
      setDevices(fetchedDevices);
      console.log(`[@component:NavigationEditor] Successfully loaded ${fetchedDevices.length} devices`);
    } catch (error: any) {
      console.error('[@component:NavigationEditor] Error fetching devices:', error);
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Auto-populate connection form when device is selected - stabilized dependencies
  useEffect(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return;

    const deviceRemoteConfig = selectedDeviceData.controller_configs.remote;
    
    console.log(`[@component:NavigationEditor] Auto-populating connection form for device: ${selectedDeviceData.name}`, deviceRemoteConfig);
    console.log(`[@component:NavigationEditor] Device ${selectedDeviceData.name} has remote type: ${deviceRemoteConfig.type}`);
    
    if (hasAVCapabilities) {
      console.log(`[@component:NavigationEditor] Device ${selectedDeviceData.name} has AV capabilities for screen definition`);
    }
  }, [selectedDeviceData?.name, selectedDeviceData?.controller_configs?.remote, hasAVCapabilities]);

  // Handle disconnection when control is released - stabilized dependencies
  useEffect(() => {
    if (!remoteConfig || isControlActive) return;

    console.log(`[@component:NavigationEditor] Control released, disconnecting from ${remoteConfig.type} device`);
    console.log(`[@component:NavigationEditor] Disconnection will be handled by the generic remote component`);
  }, [isControlActive, remoteConfig?.type]);

  const {
    // State
    nodes,
    edges,
    treeName,
    isLoadingInterface,
    selectedNode,
    selectedEdge,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    nodeForm,
    edgeForm,
    isLoading,
    error,
    success,
    reactFlowWrapper,
    reactFlowInstance,
    treeId,
    interfaceId,
    
    // Navigation state
    currentTreeId,
    currentTreeName,
    navigationPath,
    navigationNamePath,
    hasUnsavedChanges,
    isDiscardDialogOpen,
    userInterface,
    rootTree,
    
    // History state
    history,
    historyIndex,
    
    // View state for single-level navigation
    viewPath,
    navigateToParentView,
    
    // Tree filtering state
    focusNodeId,
    maxDisplayDepth,
    availableFocusNodes,
    allNodes,
    setFocusNode,
    setDisplayDepth,
    resetFocus,
    
    // Setters
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setNodeForm,
    setEdgeForm,
    setIsDiscardDialogOpen,
    
    // Event handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick,
    onPaneClick,
    
    // Actions
    loadFromDatabase,
    saveToDatabase,
    handleNodeFormSubmit,
    handleEdgeFormSubmit,
    handleDeleteNode,
    handleDeleteEdge,
    navigateToParent,
    addNewNode,
    cancelNodeChanges,
    discardChanges,
    performDiscardChanges,
    navigateToTreeLevel,
    goBackToParent,
    closeSelectionPanel,
    undo,
    redo,
    fitView,
    deleteSelected,
    resetNode,
    
    // Additional setters we need
    setNodes,
    setSelectedNode,
    setReactFlowInstance,
    setAllNodes,
    setHasUnsavedChanges,
    setEdges,
    setSelectedEdge,
    
    // Configuration
    defaultEdgeOptions,
    
    // Connection rules and debugging
    getConnectionRulesSummary,
  } = useNavigationEditor();
  
  // Track the last loaded tree ID to prevent unnecessary reloads
  const lastLoadedTreeId = useRef<string | null>(null);
  
  // Show message if tree ID is missing
  useEffect(() => {
    if (!treeId && !interfaceId) {
      console.log('[@component:NavigationEditor] Missing tree ID in URL');
    }
  }, [treeId, interfaceId]);
  
  // Load tree data when component mounts or treeId changes
  useEffect(() => {
    if (currentTreeId && !isLoadingInterface && currentTreeId !== lastLoadedTreeId.current) {
      console.log(`[@component:NavigationEditor] Loading tree data for: ${currentTreeId}`);
      lastLoadedTreeId.current = currentTreeId;
      loadFromDatabase();
    }
  }, [currentTreeId, isLoadingInterface]);

  // Handle remote control actions
  const handleToggleRemotePanel = useCallback(() => {
    setIsRemotePanelOpen(prev => !prev);
  }, []);

  const handleDeviceSelect = useCallback((device: string | null) => {
    // If changing device while connected, disconnect first
    if (selectedDevice && selectedDevice !== device && isControlActive) {
      console.log('[@component:NavigationEditor] Switching devices, stopping current control');
      setIsControlActive(false);
    }
    
    // Reset SSH session state when changing devices
    if (selectedDevice !== device) {
      setSSHSession({
        connected: false,
        connectionLoading: false,
        connectionError: null,
      });
    }
    
    setSelectedDevice(device);
  }, [selectedDevice, isControlActive]);

  const handleTakeControl = useCallback(async () => {
    const wasControlActive = isControlActive;
    
    // If we're releasing control, check if stream needs to be restarted BEFORE disconnecting
    if (wasControlActive && selectedDeviceData && hasAVCapabilities) {
      console.log('[@component:NavigationEditor] Releasing control, checking stream status before disconnect...');
      
      try {
        // Check current stream status while SSH connection is still active
        const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success && !data.is_active) {
            console.log('[@component:NavigationEditor] Stream was stopped, will restart after disconnect...');
            
            // Restart the stream before disconnecting
            const restartResponse = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/restart', {
              method: 'POST'
            });
            
            if (restartResponse.ok) {
              const restartData = await restartResponse.json();
              if (restartData.success) {
                console.log('[@component:NavigationEditor] Stream restarted successfully before releasing control');
              }
            }
          } else if (data.success && data.is_active) {
            console.log('[@component:NavigationEditor] Stream is already running, no restart needed');
          }
        } else {
          console.log('[@component:NavigationEditor] Stream status check failed, SSH connection may not be available');
        }
      } catch (error) {
        console.log('[@component:NavigationEditor] Could not check/restart stream before disconnect:', error);
        // Don't throw error, just log it
      }
    }
    
    // Now set control to false, which will trigger disconnect
    setIsControlActive(!isControlActive);
  }, [isControlActive, selectedDeviceData, hasAVCapabilities]);

  // Memoize session state change handler to prevent recreating on every render
  const handleSessionStateChange = useCallback((session: {
    connected: boolean;
    connectionLoading: boolean;
    connectionError: string | null;
  }) => {
    setSSHSession(session);
  }, []);

  // Memoize disconnect complete handler
  const handleDisconnectComplete = useCallback(() => {
    // When remote component disconnects (user clicked disconnect), release control
    console.log('[@component:NavigationEditor] Remote component disconnected, releasing control');
    
    // Release control state since the remote has already handled SSH disconnection
    setIsControlActive(false);
    
    // Hide the remote panel if it's open
    if (isRemotePanelOpen) {
      handleToggleRemotePanel();
    }
  }, [isRemotePanelOpen, handleToggleRemotePanel]);

  // Handle taking screenshot
  const handleTakeScreenshot = async () => {
    if (!selectedDevice || !isControlActive || !selectedNode) {
      console.log('[@component:NavigationEditor] Cannot take screenshot: no device selected, not in control, or no node selected');
      return;
    }

    try {
      // Get node name from selected node
      const nodeName = selectedNode.data.label || 'unknown';
      
      // Get parent name from selected node
      let parentName = 'root';
      if (selectedNode.data.parent && selectedNode.data.parent.length > 0) {
        // Find the parent node by ID
        const parentId = selectedNode.data.parent[selectedNode.data.parent.length - 1]; // Get the immediate parent
        const parentNode = nodes.find(node => node.id === parentId);
        if (parentNode) {
          parentName = parentNode.data.label || 'unknown';
        }
      }

      console.log(`[@component:NavigationEditor] Taking screenshot for device: ${selectedDevice}, parent: ${parentName}, node: ${nodeName}`);
      
      // Call screenshot API with parent and node name parameters
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_model: selectedDeviceData?.model || 'android_mobile',
          video_device: selectedDeviceData?.controller_configs?.av?.parameters?.video_device || '/dev/video0',
          parent_name: parentName,
          node_name: nodeName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[@component:NavigationEditor] Screenshot taken successfully:', data);
        
        if (data.success) {
          console.log(`[@component:NavigationEditor] Screenshot saved to: ${data.screenshot_path}`);
          
          // Use the additional_screenshot_path if available (parent/node structure), otherwise fall back to screenshot_path
          const screenshotPath = data.additional_screenshot_path || data.screenshot_path;
          const screenshotUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(screenshotPath)}`;
          
          // Create updated node with screenshot
          const updatedNode = {
            ...selectedNode,
            data: {
              ...selectedNode.data,
              screenshot: screenshotUrl
            }
          };
          
          // Create a function to update nodes consistently
          const updateNodeFunction = (nodes: any[]) => 
            nodes.map(node => 
              node.id === selectedNode.id ? updatedNode : node
            );
          
          // Update both filtered nodes and allNodes arrays
          setNodes(updateNodeFunction);
          setAllNodes(updateNodeFunction);
          
          // Update selected node so the panel reflects the change
          setSelectedNode(updatedNode);
          
          // Mark tree as having unsaved changes
          setHasUnsavedChanges(true);
          
          console.log(`[@component:NavigationEditor] Updated node ${selectedNode.id} with screenshot: ${screenshotUrl}`);
          console.log(`[@component:NavigationEditor] Marked tree as having unsaved changes`);
          
          // You can add additional logic here like:
          // - Show a success notification
          // - Save the tree to database to persist the screenshot
          // - Display the screenshot path to the user
        } else {
          console.error('[@component:NavigationEditor] Screenshot failed:', data.error);
        }
      } else {
        console.error('[@component:NavigationEditor] Screenshot failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[@component:NavigationEditor] Error taking screenshot:', error);
    }
  };

  // Initialize verification controllers when device control is activated
  const initializeVerificationControllers = useCallback(async () => {
    if (!selectedDevice || !isControlActive) {
      console.log('[@component:NavigationEditor] Cannot initialize verification controllers: no device selected or not in control');
      setIsVerificationActive(false);
      setVerificationControllerStatus({
        image_controller_available: false,
        text_controller_available: false,
      });
      return;
    }

    try {
      console.log(`[@component:NavigationEditor] Initializing verification controllers for device: ${selectedDevice}`);
      
      // Take control of verification controllers
      const takeControlResponse = await fetch('http://localhost:5009/api/virtualpytest/verification/take-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_model: selectedDeviceData?.model || 'android_mobile',
          video_device: selectedDeviceData?.controller_configs?.av?.parameters?.video_device || '/dev/video0',
        }),
      });

      if (takeControlResponse.ok) {
        const controlData = await takeControlResponse.json();
        console.log('[@component:NavigationEditor] Verification controllers initialized:', controlData);
        
        // Get controller status
        const statusResponse = await fetch('http://localhost:5009/api/virtualpytest/verification/status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('[@component:NavigationEditor] Verification controller status:', statusData);
          
          setVerificationControllerStatus({
            image_controller_available: statusData.image_controller_available || false,
            text_controller_available: statusData.text_controller_available || false,
          });
          setIsVerificationActive(true);
        } else {
          console.error('[@component:NavigationEditor] Failed to get verification controller status');
          setIsVerificationActive(false);
        }
      } else {
        console.error('[@component:NavigationEditor] Failed to initialize verification controllers:', takeControlResponse.status);
        setIsVerificationActive(false);
        setVerificationControllerStatus({
          image_controller_available: false,
          text_controller_available: false,
        });
      }
    } catch (error) {
      console.error('[@component:NavigationEditor] Error initializing verification controllers:', error);
      setIsVerificationActive(false);
      setVerificationControllerStatus({
        image_controller_available: false,
        text_controller_available: false,
      });
    }
  }, [selectedDevice, isControlActive, selectedDeviceData]);

  // Release verification controllers when device control is deactivated
  const releaseVerificationControllers = useCallback(async () => {
    if (!isVerificationActive) {
      return;
    }

    try {
      console.log('[@component:NavigationEditor] Releasing verification controllers');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/verification/release-control', {
        method: 'POST',
      });

      if (response.ok) {
        console.log('[@component:NavigationEditor] Verification controllers released successfully');
      } else {
        console.error('[@component:NavigationEditor] Failed to release verification controllers:', response.status);
      }
    } catch (error) {
      console.error('[@component:NavigationEditor] Error releasing verification controllers:', error);
    } finally {
      setIsVerificationActive(false);
      setVerificationControllerStatus({
        image_controller_available: false,
        text_controller_available: false,
      });
    }
  }, [isVerificationActive]);

  // Handle verification execution
  const handleVerification = useCallback(async (nodeId: string, verifications: any[]) => {
    if (!isVerificationActive || !verifications || verifications.length === 0) {
      console.log('[@component:NavigationEditor] Cannot execute verifications: controllers not active or no verifications');
      return;
    }

    try {
      console.log(`[@component:NavigationEditor] Executing ${verifications.length} verifications for node: ${nodeId}`);
      
      // Clear previous results and set current node
      setVerificationResults([]);
      setLastVerifiedNodeId(nodeId);
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/verification/execute-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifications: verifications,
          node_id: nodeId,
          model: selectedDeviceData?.model || 'android_mobile' // Add model for proper result handling
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[@component:NavigationEditor] Verification results:', data);
        
        // Process results to match VerificationTestResult interface
        const processedResults = data.results ? data.results.map((result: any, index: number) => {
          const verification = verifications[index];
          
          console.log(`[@component:NavigationEditor] Processing result ${index}:`, result);
          console.log(`[@component:NavigationEditor] Verification ${index}:`, verification);
          
          // Determine result type
          let resultType: 'PASS' | 'FAIL' | 'ERROR' = 'FAIL';
          if (result.success) {
            resultType = 'PASS';
          } else if (result.error && !result.message) {
            resultType = 'ERROR';
          }
          
          const processedResult = {
            success: result.success,
            message: result.message,
            error: result.error,
            threshold: result.threshold,
            resultType: resultType,
            sourceImageUrl: result.source_image_url,
            referenceImageUrl: result.reference_image_url,
            extractedText: result.extracted_text,
            searchedText: result.searched_text,
            imageFilter: result.image_filter,
            detectedLanguage: result.detected_language,
            languageConfidence: result.language_confidence,
            ocrConfidence: result.ocr_confidence,
            // Add ADB-specific fields
            search_term: result.search_term,
            wait_time: result.wait_time,
            total_matches: result.total_matches,
            matches: result.matches,
          };
          
          console.log(`[@component:NavigationEditor] Processed result ${index}:`, processedResult);
          return processedResult;
        }) : [];
        
        console.log(`[@component:NavigationEditor] Setting verification results:`, processedResults);
        setVerificationResults(processedResults);
        
        // Show summary like in NodeVerificationsList
        if (data.results) {
          const passed = data.results.filter((r: any) => r.success).length;
          const total = data.results.length;
          console.log(`[@component:NavigationEditor] Verification completed: ${passed}/${total} passed`);
          
          // Log final result based on pass condition
          const finalPassed = verificationPassCondition === 'all'
            ? passed === total
            : passed > 0;
          console.log(`[@component:NavigationEditor] Final result (${verificationPassCondition}): ${finalPassed ? 'PASS' : 'FAIL'}`);
        }
      } else {
        console.error('[@component:NavigationEditor] Verification failed:', response.status, response.statusText);
        setVerificationResults([]);
      }
    } catch (error) {
      console.error('[@component:NavigationEditor] Error executing verifications:', error);
      setVerificationResults([]);
    }
  }, [isVerificationActive, selectedDeviceData?.model, verificationPassCondition]);

  // Handle node updates - callback for NodeSelectionPanel
  const handleUpdateNode = useCallback((nodeId: string, updatedData: any) => {
    console.log(`[@component:NavigationEditor] Updating node ${nodeId} with data:`, updatedData);
    
    // Check if this is a validation update that needs special handling
    if (updatedData._validation_update && updatedData._validation_result) {
      const validationResult = updatedData._validation_result.success;
      
      // Create a function to update nodes with validation results
      const updateNodeFunction = (nodes: any[]) => 
        nodes.map(node => {
          if (node.id === nodeId) {
            const existingData = node.data || {};
            const existingVerifications = existingData.verifications || [];
            
            // Update verifications with validation result
            let updatedVerifications;
            if (existingVerifications.length > 0) {
              // Update the first verification's last_run_result
              updatedVerifications = existingVerifications.map((verification, index) => {
                if (index === 0) {
                  const existingResults = verification.last_run_result || [];
                  const updatedResults = [validationResult, ...existingResults].slice(0, 10); // Keep last 10
                  return {
                    ...verification,
                    last_run_result: updatedResults
                  };
                }
                return verification;
              });
            } else {
              // Create a default verification with the validation result
              updatedVerifications = [{
                type: 'validation',
                last_run_result: [validationResult]
              }];
            }
            
            return {
              ...node,
              data: {
                ...existingData,
                verifications: updatedVerifications,
                last_validation_timestamp: updatedData._validation_result.timestamp
              }
            };
          }
          return node;
        });
      
      // Update both filtered nodes and allNodes arrays
      setNodes(updateNodeFunction);
      setAllNodes(updateNodeFunction);
      
      // Update selected node if it's the one being updated
      if (selectedNode && selectedNode.id === nodeId) {
        const updatedNodeData = updateNodeFunction([selectedNode])[0];
        setSelectedNode(updatedNodeData);
      }
      
      console.log(`[@component:NavigationEditor] Updated node ${nodeId} with validation result: ${validationResult}`);
    } else {
      // Regular update - use simple object spread
      const updateNodeFunction = (nodes: any[]) => 
        nodes.map(node => 
          node.id === nodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
        );
      
      // Update both filtered nodes and allNodes arrays
      setNodes(updateNodeFunction);
      setAllNodes(updateNodeFunction);
      
      // Update selected node if it's the one being updated
      if (selectedNode && selectedNode.id === nodeId) {
        const updatedNode = { ...selectedNode, data: { ...selectedNode.data, ...updatedData } };
        setSelectedNode(updatedNode);
      }
      
      console.log(`[@component:NavigationEditor] Updated node ${nodeId} with regular data`);
    }
    
    // Mark tree as having unsaved changes
    setHasUnsavedChanges(true);
    
    console.log(`[@component:NavigationEditor] Updated node ${nodeId} and marked tree as having unsaved changes`);
  }, [setNodes, setAllNodes, setSelectedNode, setHasUnsavedChanges, selectedNode]);

  // Handle edge updates - callback for EdgeSelectionPanel
  const handleUpdateEdge = useCallback((edgeId: string, updatedData: any) => {
    console.log(`[@component:NavigationEditor] Updating edge ${edgeId} with data:`, updatedData);
    
    // Check if this is a validation update that needs special handling
    if (updatedData._validation_update && updatedData._validation_result) {
      const validationResult = updatedData._validation_result.success;
      
      // Update edges array with validation results
      setEdges(prevEdges => 
        prevEdges.map(edge => {
          if (edge.id === edgeId) {
            const existingData = edge.data || {};
            const existingActions = existingData.actions || [];
            
            // Update actions with validation result
            let updatedActions;
            if (existingActions.length > 0) {
              // Update the first action's last_run_result
              updatedActions = existingActions.map((action, index) => {
                if (index === 0) {
                  const existingResults = action.last_run_result || [];
                  const updatedResults = [validationResult, ...existingResults].slice(0, 10); // Keep last 10
                  return {
                    ...action,
                    last_run_result: updatedResults
                  };
                }
                return action;
              });
            } else {
              // Create a default action with the validation result
              updatedActions = [{
                type: 'validation',
                last_run_result: [validationResult]
              }];
            }
            
            return {
              ...edge,
              data: {
                ...existingData,
                actions: updatedActions,
                last_validation_timestamp: updatedData._validation_result.timestamp
              }
            };
          }
          return edge;
        })
      );
      
      // Update selected edge if it's the one being updated
      if (selectedEdge && selectedEdge.id === edgeId) {
        setSelectedEdge(prevEdge => {
          if (!prevEdge || prevEdge.id !== edgeId) return prevEdge;
          
          const existingData = prevEdge.data || {};
          const existingActions = existingData.actions || [];
          
          let updatedActions;
          if (existingActions.length > 0) {
            updatedActions = existingActions.map((action, index) => {
              if (index === 0) {
                const existingResults = action.last_run_result || [];
                const updatedResults = [validationResult, ...existingResults].slice(0, 10);
                return {
                  ...action,
                  last_run_result: updatedResults
                };
              }
              return action;
            });
          } else {
            updatedActions = [{
              type: 'validation',
              last_run_result: [validationResult]
            }];
          }
          
          return {
            ...prevEdge,
            data: {
              ...existingData,
              actions: updatedActions,
              last_validation_timestamp: updatedData._validation_result.timestamp
            }
          };
        });
      }
      
      console.log(`[@component:NavigationEditor] Updated edge ${edgeId} with validation result: ${validationResult}`);
    } else {
      // Regular update - use simple object spread
      setEdges(prevEdges => 
        prevEdges.map(edge => 
          edge.id === edgeId ? { ...edge, data: { ...edge.data, ...updatedData } } : edge
        )
      );
      
      // Update selected edge if it's the one being updated
      if (selectedEdge && selectedEdge.id === edgeId) {
        const updatedEdge = { ...selectedEdge, data: { ...selectedEdge.data, ...updatedData } };
        setSelectedEdge(updatedEdge);
      }
      
      console.log(`[@component:NavigationEditor] Updated edge ${edgeId} with regular data`);
    }
    
    // Mark tree as having unsaved changes
    setHasUnsavedChanges(true);
    
    console.log(`[@component:NavigationEditor] Updated edge ${edgeId} and marked tree as having unsaved changes`);
  }, [setEdges, setSelectedEdge, setHasUnsavedChanges, selectedEdge]);

  // Effect to initialize/release verification controllers when control state changes
  useEffect(() => {
    if (isControlActive && selectedDevice) {
      initializeVerificationControllers();
    } else {
      releaseVerificationControllers();
    }
  }, [isControlActive, selectedDevice, initializeVerificationControllers, releaseVerificationControllers]);

  // Clear verification results when a different node is selected
  useEffect(() => {
    if (selectedNode?.id && lastVerifiedNodeId && selectedNode.id !== lastVerifiedNodeId) {
      setVerificationResults([]);
      setLastVerifiedNodeId(null);
    }
  }, [selectedNode?.id, lastVerifiedNodeId]);

  // Validation colors are automatically loaded from localStorage by Zustand persistence
  // No manual initialization needed
  
  return (
    <Box sx={{ 
      width: '100%',
      height: 'calc(100vh - 100px)', 
      minHeight: '500px',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with NavigationEditorHeader component */}
      <NavigationEditorHeader
        navigationPath={navigationPath}
        navigationNamePath={navigationNamePath}
        viewPath={viewPath}
        hasUnsavedChanges={hasUnsavedChanges}
        focusNodeId={focusNodeId}
        availableFocusNodes={availableFocusNodes}
        maxDisplayDepth={maxDisplayDepth}
        totalNodes={allNodes.length}
        visibleNodes={nodes.length}
        isLoading={isLoading}
        error={error}
        historyIndex={historyIndex}
        historyLength={history.length}
        userInterface={userInterface}
        selectedDevice={selectedDevice}
        isControlActive={isControlActive}
        isRemotePanelOpen={isRemotePanelOpen}
        devices={devices}
        devicesLoading={devicesLoading}
        treeId={currentTreeId}
        onNavigateToParent={navigateToParent}
        onNavigateToTreeLevel={navigateToTreeLevel}
        onNavigateToParentView={navigateToParentView}
        onAddNewNode={addNewNode}
        onFitView={fitView}
        onUndo={undo}
        onRedo={redo}
        onSaveToDatabase={saveToDatabase}
        onDiscardChanges={discardChanges}
        onFocusNodeChange={setFocusNode}
        onDepthChange={setDisplayDepth}
        onResetFocus={resetFocus}
        onToggleRemotePanel={handleToggleRemotePanel}
        onDeviceSelect={handleDeviceSelect}
        onTakeControl={handleTakeControl}
        onUpdateNode={handleUpdateNode}
        onUpdateEdge={handleUpdateEdge}
      />

      {/* Main Container with side-by-side layout */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        minHeight: '500px',
        overflow: 'hidden'
      }}>
        {/* Main Editor Area */}
        <Box sx={{ 
          flex: 1, 
          position: 'relative', 
          minHeight: '500px',
          overflow: 'hidden',
          transition: 'margin-right',
          marginRight: isRemotePanelOpen ? '180px' : '0px'
        }}>
          {isLoading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}>
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>
                {isLoadingInterface ? 'Loading navigation tree...' : 'Saving navigation tree...'}
              </Typography>
            </Box>
          ) : error ? (
            <Container maxWidth="md" sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              textAlign: 'center'
            }}>
              <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" color="error" gutterBottom>
                Error Loading Navigation Tree
              </Typography>
              <Typography variant="body1" paragraph>
                {error}
              </Typography>
              <Button 
                variant="contained" 
                onClick={navigateToParent} 
                startIcon={<ArrowBackIcon />}
              >
                Return to Navigation Trees
              </Button>
            </Container>
          ) : (
            <>
              <div 
                ref={reactFlowWrapper} 
                style={{ 
                  width: '100%',
                  height: '100%',
                  minHeight: '500px'
                }}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onEdgeClick={onEdgeClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onPaneClick={onPaneClick}
                  onInit={(instance) => {
                    if (instance && !reactFlowInstance) {
                      console.log('[@component:NavigationEditor] ReactFlow instance initialized');
                      setReactFlowInstance(instance);
                    }
                  }}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={{
                    type: 'uiNavigation',
                    animated: false,
                    style: { strokeWidth: 2, stroke: '#b1b1b7' },
                  }}
                  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                  // Ensure consistent viewport and prevent auto-fitting
                  translateExtent={[[-5000, -5000], [10000, 10000]]}
                  nodeExtent={[[-5000, -5000], [10000, 10000]]}
                  attributionPosition="bottom-left"
                  connectionLineType={ConnectionLineType.SmoothStep}
                  snapToGrid={true}
                  snapGrid={[15, 15]}
                  deleteKeyCode="Delete"
                  multiSelectionKeyCode="Shift"
                  style={{ width: '100%', height: '100%' }}
                  fitView={false}
                  nodesDraggable={true}
                  nodesConnectable={true}
                  elementsSelectable={true}
                  preventScrolling={false}
                  panOnDrag={true}
                  panOnScroll={false}
                  zoomOnScroll={true}
                  zoomOnPinch={true}
                  zoomOnDoubleClick={false}
                  minZoom={0.1}
                  maxZoom={4}
                  // Disable React Flow's auto-positioning features
                  proOptions={{ hideAttribution: true }}
                  // Prevent automatic layout algorithms
                  nodeOrigin={[0, 0]}
                  // Additional props to prevent automatic positioning
                  autoPanOnConnect={false}
                  autoPanOnNodeDrag={false}
                  connectOnClick={false}
                  // Prevent automatic centering or repositioning
                  onlyRenderVisibleElements={false}
                >
                  <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                  <Controls position="top-left" showZoom={true} showFitView={true} showInteractive={false} />
                  <MiniMap 
                    position="bottom-right"
                    style={{
                      backgroundColor: 'var(--card, #ffffff)',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                    nodeColor={(node) => {
                      switch (node.data?.type) {
                        case 'screen': return '#3b82f6';
                        case 'dialog': return '#8b5cf6';
                        case 'popup': return '#f59e0b';
                        case 'overlay': return '#10b981';
                        case 'menu': return '#ffc107';
                        default: return '#6b7280';
                      }
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                  />
                </ReactFlow>
              </div>

              {/* Screen Definition Editor - Show when device has AV capabilities and control is active */}
              {selectedDeviceData && hasAVCapabilities && isControlActive && (
                <ScreenDefinitionEditor
                  deviceConfig={selectedDeviceData.controller_configs}
                  deviceModel={selectedDeviceData.model}
                  autoConnect={true}
                  onDisconnectComplete={() => {
                    // Called when screen definition editor disconnects
                    console.log('[@component:NavigationEditor] Screen definition editor disconnected');
                  }}
                />
              )}

              {/* Verification Results Display - Show when there are verification results */}
              {(() => {
                const shouldShow = verificationResults.length > 0 && lastVerifiedNodeId;
                console.log(`[@component:NavigationEditor] Verification display check: results.length=${verificationResults.length}, lastVerifiedNodeId=${lastVerifiedNodeId}, shouldShow=${shouldShow}`);
                if (shouldShow) {
                  console.log(`[@component:NavigationEditor] Rendering verification results for node:`, nodes.find(n => n.id === lastVerifiedNodeId)?.data.label);
                }
                return shouldShow;
              })() && (
                <Box sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: selectedNode || selectedEdge ? '220px' : '16px', // Account for selection panel
                  maxWidth: '800px',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  zIndex: 900,
                  maxHeight: '300px',
                  overflow: 'auto',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
                      Verification Results - Node: {nodes.find(n => n.id === lastVerifiedNodeId)?.data.label || lastVerifiedNodeId}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setVerificationResults([]);
                        setLastVerifiedNodeId(null);
                      }}
                      sx={{ p: 0.25 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <VerificationResultsDisplay
                    testResults={verificationResults}
                    verifications={nodes.find(n => n.id === lastVerifiedNodeId)?.data.verifications || []}
                    passCondition={verificationPassCondition}
                    onPassConditionChange={setVerificationPassCondition}
                    showPassConditionSelector={true}
                    compact={false}
                  />
                </Box>
              )}

              {/* Selection Info Panel */}
              {(selectedNode || selectedEdge) ? (
                <>
                  {selectedNode && (
                    <NodeSelectionPanel
                      selectedNode={selectedNode}
                      nodes={nodes}
                      onClose={closeSelectionPanel}
                      onEdit={() => {}}
                      onDelete={deleteSelected}
                      onAddChildren={() => {}}
                      setNodeForm={setNodeForm}
                      setIsNodeDialogOpen={setIsNodeDialogOpen}
                      onReset={resetNode}
                      isControlActive={isControlActive}
                      selectedDevice={selectedDevice}
                      onTakeScreenshot={handleTakeScreenshot}
                      treeId={currentTreeId || ''}
                      currentNodeId={focusNodeId || undefined}
                      onVerification={handleVerification}
                      isVerificationActive={isVerificationActive}
                      verificationControllerStatus={verificationControllerStatus}
                      onUpdateNode={handleUpdateNode}
                    />
                  )}
                  
                  {selectedEdge && (
                    <EdgeSelectionPanel
                      selectedEdge={selectedEdge}
                      onClose={closeSelectionPanel}
                      onEdit={() => {}}
                      onDelete={deleteSelected}
                      setEdgeForm={setEdgeForm}
                      setIsEdgeDialogOpen={setIsEdgeDialogOpen}
                      isControlActive={isControlActive}
                      selectedDevice={selectedDevice}
                      controllerTypes={userInterface?.models || []}
                      onUpdateEdge={handleUpdateEdge}
                    />
                  )}
                </>
              ) : null}
            </>
          )}
        </Box>

        {/* Remote Control Panel - Only show if device has remote capabilities */}
        {isRemotePanelOpen && remoteConfig && (
          <>
            {/* Android Mobile uses compact component instead of modal */}
            {remoteConfig.type === 'android_mobile' ? (
              <Box sx={{
                position: 'fixed',
                right: 0,
                top: '130px',
                width: '320px',
                height: 'calc(100vh - 130px)',
                bgcolor: 'background.paper',
                borderLeft: '1px solid',
                borderColor: 'divider',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
              }}>
                <Box sx={{ 
                  p: 1, 
                  borderBottom: '1px solid', 
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" component="div">
                    Android Mobile Remote
                  </Typography>
                </Box>
                
                <CompactAndroidMobileWithSessionTracking
                  connectionConfig={androidConnectionConfig}
                  autoConnect={isControlActive}
                  onDisconnectComplete={handleDisconnectComplete}
                  onSessionStateChange={handleSessionStateChange}
                  sx={{ flex: 1, height: '100%' }}
                />
              </Box>
            ) : (
              <Box sx={{
                position: 'fixed',
                right: 0,
                top: '130px',
                width: '320px',
                height: 'calc(100vh - 130px)',
                bgcolor: 'background.paper',
                borderLeft: '1px solid',
                borderColor: 'divider',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
              }}>
                <Box sx={{ 
                  p: 0, 
                  borderBottom: '1px solid', 
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" component="div">
                    {remoteConfig.type === 'android_tv' ? 'Android TV Remote' :
                     remoteConfig.type === 'ir_remote' ? 'IR Remote' :
                     remoteConfig.type === 'bluetooth_remote' ? 'Bluetooth Remote' :
                     'Remote Control'}
                  </Typography>
                </Box>
                
                {/* Remote Panel Content - Dynamic based on device type */}
                {remoteConfig.type === 'android_tv' ? (
                  <CompactRemoteWithSessionTracking
                    remoteType="android-tv"
                    connectionConfig={androidConnectionConfig}
                    autoConnect={isControlActive}
                    showScreenshot={false}
                    onDisconnectComplete={handleDisconnectComplete}
                    onSessionStateChange={handleSessionStateChange}
                    sx={{ flex: 1, height: '100%' }}
                  />
                ) : remoteConfig.type === 'ir_remote' ? (
                  <CompactRemoteWithSessionTracking
                    remoteType="ir"
                    connectionConfig={irConnectionConfig}
                    autoConnect={isControlActive}
                    onDisconnectComplete={handleDisconnectComplete}
                    onSessionStateChange={handleSessionStateChange}
                    sx={{ flex: 1, height: '100%' }}
                  />
                ) : remoteConfig.type === 'bluetooth_remote' ? (
                  <CompactRemoteWithSessionTracking
                    remoteType="bluetooth"
                    connectionConfig={bluetoothConnectionConfig}
                    autoConnect={isControlActive}
                    onDisconnectComplete={handleDisconnectComplete}
                    onSessionStateChange={handleSessionStateChange}
                    sx={{ flex: 1, height: '100%' }}
                  />
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Unsupported remote type: {remoteConfig.type}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Node Edit Dialog */}
      <NodeEditDialog
        isOpen={isNodeDialogOpen}
        nodeForm={nodeForm}
        nodes={nodes}
        setNodeForm={setNodeForm}
        onSubmit={handleNodeFormSubmit}
        onClose={cancelNodeChanges}
        onResetNode={resetNode}
        verificationControllerTypes={['text', 'image']}
        isVerificationActive={isVerificationActive}
        selectedDevice={selectedDevice}
        isControlActive={isControlActive}
        model={userInterface?.models?.[0] || 'android_mobile'}
      />

      {/* Edge Edit Dialog */}
      <EdgeEditDialog
        isOpen={isEdgeDialogOpen}
        edgeForm={edgeForm}
        setEdgeForm={setEdgeForm}
        onSubmit={handleEdgeFormSubmit}
        onClose={() => setIsEdgeDialogOpen(false)}
        controllerTypes={userInterface?.models || []}
        selectedEdge={selectedEdge}
        isControlActive={isControlActive}
        selectedDevice={selectedDevice}
      />

      {/* Discard Changes Confirmation Dialog */}
      <Dialog open={isDiscardDialogOpen} onClose={() => setIsDiscardDialogOpen(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Are you sure you want to discard them and revert to the last saved state?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDiscardDialogOpen(false)}>Cancel</Button>
          <Button onClick={performDiscardChanges} color="warning" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      {success && (
      <Snackbar
          open={!!success}
        autoHideDuration={3000}
          onClose={() => {}}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
          <Alert severity="success" sx={{ width: '100%' }}>
            {success}
        </Alert>
      </Snackbar>
      )}
    </Box>
  );
};

const NavigationEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <NavigationEditorContent />
    </ReactFlowProvider>
  );
};

export default NavigationEditor; 