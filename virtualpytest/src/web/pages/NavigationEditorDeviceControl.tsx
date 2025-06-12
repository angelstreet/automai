import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';

// Import NEW generic remote components instead of device-specific ones
import { CompactRemote } from '../components/remote/CompactRemote';
import { CompactAndroidMobile } from '../components/remote/CompactAndroidMobile';

// Import ScreenDefinitionEditor
import { ScreenDefinitionEditor } from '../components/userinterface/UserInterface_ScreenDefinitionEditor';

// Import device utilities
import { getDeviceRemoteConfig, extractConnectionConfigForAndroid, extractConnectionConfigForIR, extractConnectionConfigForBluetooth } from '../utils/device/deviceRemoteMappingUtils';

// Import registration context
import { useRegistration } from '../contexts/RegistrationContext';

// Import verification display
import { VerificationResultsDisplay } from '../components/verification/VerificationResultsDisplay';
import { NavigationEditorDeviceControlProps } from '../types/pages/Navigation_Types';

export const NavigationEditorDeviceControl: React.FC<NavigationEditorDeviceControlProps> = ({
  selectedHost,
  isControlActive,
  isRemotePanelOpen,
  isVerificationActive,
  verificationControllerStatus,
  verificationResults,
  verificationPassCondition,
  lastVerifiedNodeId,
  nodes,
  selectedNode,
  selectedEdge,
  userInterface,
  onReleaseControl,
  onUpdateNode,
  onSetVerificationResults,
  onSetLastVerifiedNodeId,
  onSetVerificationPassCondition,
  onSetNodes,
  onSetSelectedNode,
  onSetHasUnsavedChanges,
}) => {
  // Memoize computed values based on selectedHost from registration context
  const remoteConfig = useMemo(() => {
    return selectedHost ? getDeviceRemoteConfig(selectedHost) : null;
  }, [selectedHost]);
  
  const hasAVCapabilities = useMemo(() => {
    return selectedHost?.controller_configs?.av?.parameters != null;
  }, [selectedHost]);

  // Memoize connection configs to prevent object recreation
  const androidConnectionConfig = useMemo(() => {
    if (!selectedHost?.controller_configs?.remote) return null;
    return extractConnectionConfigForAndroid(selectedHost.controller_configs.remote);
  }, [selectedHost?.controller_configs?.remote]);

  const irConnectionConfig = useMemo(() => {
    if (!selectedHost?.controller_configs?.remote) return null;
    return extractConnectionConfigForIR(selectedHost.controller_configs.remote);
  }, [selectedHost?.controller_configs?.remote]);

  const bluetoothConnectionConfig = useMemo(() => {
    if (!selectedHost?.controller_configs?.remote) return null;
    return extractConnectionConfigForBluetooth(selectedHost.controller_configs.remote);
  }, [selectedHost?.controller_configs?.remote]);

  // Handle taking screenshot using AV controller proxy
  const handleTakeScreenshot = useCallback(async () => {
    if (!selectedHost || !isControlActive || !selectedNode) {
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

      
      
      // Use AV controller proxy instead of direct HTTP call
      const avControllerProxy = selectedHost?.controllerProxies?.av;
      if (!avControllerProxy) {
        throw new Error('AV controller proxy not available. Host may not have AV capabilities or proxy creation failed.');
      }
      
      
      
      // Call take_screenshot on the AV controller proxy
      const screenshotUrl = await avControllerProxy.take_screenshot();
      
      if (screenshotUrl) {
        
        
        // Create updated node with screenshot
        const updatedNode = {
          ...selectedNode,
          data: {
            ...selectedNode.data,
            screenshot: `data:image/png;base64,${screenshotUrl}` // Assuming base64 format
          }
        };
        
        // Update nodes
        const updateNodeFunction = (nodes: any[]) => 
          nodes.map(node => 
            node.id === selectedNode.id ? updatedNode : node
          );
        
        onSetNodes(updateNodeFunction);
        onSetSelectedNode(updatedNode);
        onSetHasUnsavedChanges(true);
        
        
      } else {
        
      }
    } catch (error) {
      
    }
  }, [selectedHost, isControlActive, selectedNode, nodes, onSetNodes, onSetSelectedNode, onSetHasUnsavedChanges]);

  // Handle verification execution using verification controller proxy
  const handleVerification = useCallback(async (nodeId: string, verifications: any[]) => {
    if (!isVerificationActive || !verifications || verifications.length === 0) {
      
      return;
    }

    try {
      
      
      // Clear previous results and set current node
      onSetVerificationResults([]);
      onSetLastVerifiedNodeId(nodeId);
      
      // Use verification controller proxy instead of server endpoint
      const verificationControllerProxy = selectedHost?.controllerProxies?.verification;
      if (!verificationControllerProxy) {
        throw new Error('Verification controller proxy not available. Host may not have verification capabilities or proxy creation failed.');
      }
      
      
      
      // Call executeVerificationBatch on the verification controller proxy
      const response = await verificationControllerProxy.executeVerificationBatch({
        verifications: verifications,
        model: selectedHost?.model || 'android_mobile',
        node_id: nodeId,
        source_filename: 'current_screenshot.jpg' // Default source filename
      });
      
      if (response.success && response.data?.results) {
        
        
        // Process results to match VerificationTestResult interface
        const processedResults = response.data.results.map((result: any, index: number) => {
          const verification = verifications[index];
          

          
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
          
          
          return processedResult;
        });
        
        
        onSetVerificationResults(processedResults);
        
        // Show summary like in NodeVerificationsList
        if (response.data.results) {
          const passed = response.data.results.filter((r: any) => r.success).length;
          const total = response.data.results.length;
          
          
          // Log final result based on pass condition
          const finalPassed = verificationPassCondition === 'all'
            ? passed === total
            : passed > 0;
          
        }
      } else {
        
        onSetVerificationResults([]);
      }
    } catch (error) {
      
      onSetVerificationResults([]);
    }
  }, [isVerificationActive, selectedHost, verificationPassCondition, onSetVerificationResults, onSetLastVerifiedNodeId]);

  return (
    <>
      {/* Screen Definition Editor - Show when device has AV capabilities and control is active */}
      {selectedHost && hasAVCapabilities && isControlActive && (
        <ScreenDefinitionEditor
          selectedHostDevice={selectedHost}
          autoConnect={true}
          onDisconnectComplete={onReleaseControl}
        />
      )}

      {/* Verification Results Display - Show when there are verification results */}
      {(() => {
        const shouldShow = verificationResults.length > 0 && lastVerifiedNodeId;
        
        if (shouldShow) {
          
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
                onSetVerificationResults([]);
                onSetLastVerifiedNodeId(null);
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
            onPassConditionChange={onSetVerificationPassCondition}
            showPassConditionSelector={true}
            compact={false}
          />
        </Box>
      )}

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
              
              <CompactAndroidMobile
                onDisconnectComplete={onReleaseControl}
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
                <CompactRemote
                  remoteType="android-tv"
                  connectionConfig={androidConnectionConfig || undefined}
                  autoConnect={isControlActive}
                  showScreenshot={false}
                  onDisconnectComplete={onReleaseControl}
                />
              ) : remoteConfig.type === 'ir_remote' ? (
                <CompactRemote
                  remoteType="ir"
                  connectionConfig={(irConnectionConfig || undefined) as any}
                  autoConnect={isControlActive}
                  onDisconnectComplete={onReleaseControl}
                />
              ) : remoteConfig.type === 'bluetooth_remote' ? (
                <CompactRemote
                  remoteType="bluetooth"
                  connectionConfig={(bluetoothConnectionConfig || undefined) as any}
                  autoConnect={isControlActive}
                  onDisconnectComplete={onReleaseControl}
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
    </>
  );
};

// Component is already exported above with 'export const'

// Export the handler functions for external use
export const createDeviceControlHandlers = (
  selectedHost: any,
  isControlActive: boolean,
  selectedNode: any,
  nodes: any[],
  onSetNodes: (updateFunction: (nodes: any[]) => any[]) => void,
  onSetSelectedNode: (node: any) => void,
  onSetHasUnsavedChanges: (hasChanges: boolean) => void,
  isVerificationActive: boolean,
  verificationPassCondition: 'all' | 'any',
  onSetVerificationResults: (results: any[]) => void,
  onSetLastVerifiedNodeId: (nodeId: string | null) => void
) => {
  // Handle taking screenshot using AV controller proxy
  const handleTakeScreenshot = async () => {
    if (!selectedHost || !isControlActive || !selectedNode) {
      
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

      console.log(`[@handlers:DeviceControl] Taking screenshot for device: ${selectedHost.name}, parent: ${parentName}, node: ${nodeName}`);
      
      // Use AV controller proxy instead of direct HTTP call
      const avControllerProxy = selectedHost?.controllerProxies?.av;
      if (!avControllerProxy) {
        throw new Error('AV controller proxy not available. Host may not have AV capabilities or proxy creation failed.');
      }
      
      console.log('[@handlers:DeviceControl] AV controller proxy found, calling take_screenshot...');
      
      // Call take_screenshot on the AV controller proxy
      const screenshotUrl = await avControllerProxy.take_screenshot();
      
      if (screenshotUrl) {
        console.log('[@handlers:DeviceControl] Screenshot taken successfully:', screenshotUrl);
        
        // Create updated node with screenshot
        const updatedNode = {
          ...selectedNode,
          data: {
            ...selectedNode.data,
            screenshot: `data:image/png;base64,${screenshotUrl}` // Assuming base64 format
          }
        };
        
        // Update nodes
        const updateNodeFunction = (nodes: any[]) => 
          nodes.map(node => 
            node.id === selectedNode.id ? updatedNode : node
          );
        
        onSetNodes(updateNodeFunction);
        onSetSelectedNode(updatedNode);
        onSetHasUnsavedChanges(true);
        
        console.log(`[@handlers:DeviceControl] Screenshot captured and node updated`);
      } else {
        console.error('[@handlers:DeviceControl] Screenshot failed - no URL returned');
      }
    } catch (error) {
      console.error('[@handlers:DeviceControl] Error taking screenshot:', error);
    }
  };

  // Handle verification execution using verification controller proxy
  const handleVerification = async (nodeId: string, verifications: any[]) => {
    if (!isVerificationActive || !verifications || verifications.length === 0) {
      console.log('[@handlers:DeviceControl] Cannot execute verifications: controllers not active or no verifications');
      return;
    }

    try {
      console.log(`[@handlers:DeviceControl] Executing ${verifications.length} verifications for node: ${nodeId}`);
      
      // Clear previous results and set current node
      onSetVerificationResults([]);
      onSetLastVerifiedNodeId(nodeId);
      
      // Use verification controller proxy instead of server endpoint
      const verificationControllerProxy = selectedHost?.controllerProxies?.verification;
      if (!verificationControllerProxy) {
        throw new Error('Verification controller proxy not available. Host may not have verification capabilities or proxy creation failed.');
      }
      
      console.log('[@handlers:DeviceControl] Verification controller proxy found, calling executeVerificationBatch...');
      
      // Call executeVerificationBatch on the verification controller proxy
      const response = await verificationControllerProxy.executeVerificationBatch({
        verifications: verifications,
        model: selectedHost?.model || 'android_mobile',
        node_id: nodeId,
        source_filename: 'current_screenshot.jpg' // Default source filename
      });
      
      if (response.success && response.data?.results) {
        console.log('[@handlers:DeviceControl] Verification results:', response.data);
        
        // Process results to match VerificationTestResult interface
        const processedResults = response.data.results.map((result: any, index: number) => {
          const verification = verifications[index];
          
          console.log(`[@handlers:DeviceControl] Processing result ${index}:`, result);
          console.log(`[@handlers:DeviceControl] Verification ${index}:`, verification);
          
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
          
          console.log(`[@handlers:DeviceControl] Processed result ${index}:`, processedResult);
          return processedResult;
        });
        
        console.log(`[@handlers:DeviceControl] Setting verification results:`, processedResults);
        onSetVerificationResults(processedResults);
        
        // Show summary like in NodeVerificationsList
        if (response.data.results) {
          const passed = response.data.results.filter((r: any) => r.success).length;
          const total = response.data.results.length;
          console.log(`[@handlers:DeviceControl] Verification completed: ${passed}/${total} passed`);
          
          // Log final result based on pass condition
          const finalPassed = verificationPassCondition === 'all'
            ? passed === total
            : passed > 0;
          console.log(`[@handlers:DeviceControl] Final result (${verificationPassCondition}): ${finalPassed ? 'PASS' : 'FAIL'}`);
        }
      } else {
        console.error('[@handlers:DeviceControl] Verification failed:', response.error);
        onSetVerificationResults([]);
      }
    } catch (error) {
      console.error('[@handlers:DeviceControl] Error executing verifications:', error);
      onSetVerificationResults([]);
    }
  };

  return {
    handleTakeScreenshot,
    handleVerification,
  };
}; 