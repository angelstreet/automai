import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Typography, IconButton } from '@mui/material';
import React, { useMemo } from 'react';

import { ScreenDefinitionEditor } from '../components/controller/av/ScreenDefinitionEditor';
import { AndroidMobileRemote } from '../components/controller/remote/AndroidMobileRemote';
import { RemotePanel } from '../components/controller/remote/RemotePanel';
import { VerificationResultsDisplay } from '../components/verification/VerificationResultsDisplay';
import { NavigationEditorDeviceControlProps } from '../types/pages/Navigation_Types';

const getDeviceRemoteConfig = (selectedHost: any) => {
  // Simple fallback - just return basic config
  return selectedHost?.controller_configs?.remote || null;
};

const extractConnectionConfigForAndroid = (remoteConfig: any) => {
  // Simple fallback - return Android config if available
  return remoteConfig?.android || null;
};

const extractConnectionConfigForIR = (remoteConfig: any) => {
  // Simple fallback - return IR config if available
  return remoteConfig?.ir || null;
};

const extractConnectionConfigForBluetooth = (remoteConfig: any) => {
  // Simple fallback - return Bluetooth config if available
  return remoteConfig?.bluetooth || null;
};

export const NavigationEditorDeviceControl: React.FC<NavigationEditorDeviceControlProps> = ({
  selectedHost,
  isControlActive,
  isRemotePanelOpen,
  verificationResults,
  verificationPassCondition,
  lastVerifiedNodeId,
  nodes,
  selectedNode,
  selectedEdge,
  onReleaseControl,
  onSetVerificationResults,
  onSetLastVerifiedNodeId,
  onSetVerificationPassCondition,
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
        <Box
          sx={{
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
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              Verification Results - Node:{' '}
              {nodes.find((n) => n.id === lastVerifiedNodeId)?.data.label || lastVerifiedNodeId}
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
            verifications={nodes.find((n) => n.id === lastVerifiedNodeId)?.data.verifications || []}
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
            <Box
              sx={{
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
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" component="div">
                  Android Mobile Remote
                </Typography>
              </Box>

              <AndroidMobileRemote
                host={selectedHost}
                autoConnect={isControlActive}
                onDisconnectComplete={onReleaseControl}
              />
            </Box>
          ) : (
            <Box
              sx={{
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
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box
                sx={{
                  p: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" component="div">
                  {remoteConfig.type === 'android_tv'
                    ? 'Android TV Remote'
                    : remoteConfig.type === 'ir_remote'
                      ? 'IR Remote'
                      : remoteConfig.type === 'bluetooth_remote'
                        ? 'Bluetooth Remote'
                        : 'Remote Control'}
                </Typography>
              </Box>

              {/* Remote Panel Content - Dynamic based on device type */}
              {remoteConfig.type === 'android_tv' ? (
                <RemotePanel
                  host={selectedHost}
                  remoteType="android-tv"
                  connectionConfig={androidConnectionConfig || undefined}
                  autoConnect={isControlActive}
                  showScreenshot={false}
                  onDisconnectComplete={onReleaseControl}
                />
              ) : remoteConfig.type === 'ir_remote' ? (
                <RemotePanel
                  host={selectedHost}
                  remoteType="ir"
                  connectionConfig={(irConnectionConfig || undefined) as any}
                  autoConnect={isControlActive}
                  onDisconnectComplete={onReleaseControl}
                />
              ) : remoteConfig.type === 'bluetooth_remote' ? (
                <RemotePanel
                  host={selectedHost}
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
  onSetNodes: (updateFunction: (nodes: any[]) => any[]) => void,
  onSetSelectedNode: (node: any) => void,
  onSetHasUnsavedChanges: (hasChanges: boolean) => void,
  isVerificationActive: boolean,
  verificationPassCondition: 'all' | 'any',
  onSetVerificationResults: (results: any[]) => void,
  onSetLastVerifiedNodeId: (nodeId: string | null) => void,
) => {
  // Handle taking screenshot using AV controller proxy
  const handleTakeScreenshot = async () => {
    if (!selectedHost || !isControlActive || !selectedNode) {
      return;
    }

    try {
      // Use server route instead of AV controller proxy
      if (!selectedHost) {
        throw new Error('No host selected for screenshot operation');
      }

      console.log(
        `[@handlers:DeviceControl] Taking screenshot for host: ${selectedHost.host_name}`,
      );

      // Call take-screenshot server route
      const response = await fetch(`/server/remote/take-screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: selectedHost.host_name,
        }),
      });

      const result = await response.json();

      if (result.success && result.screenshot) {
        console.log('[@handlers:DeviceControl] Screenshot taken successfully');

        // Create updated node with screenshot
        const updatedNode = {
          ...selectedNode,
          data: {
            ...selectedNode.data,
            screenshot: `data:image/png;base64,${result.screenshot}`,
          },
        };

        // Update nodes
        const updateNodeFunction = (nodes: any[]) =>
          nodes.map((node) => (node.id === selectedNode.id ? updatedNode : node));

        onSetNodes(updateNodeFunction);
        onSetSelectedNode(updatedNode);
        onSetHasUnsavedChanges(true);

        console.log(`[@handlers:DeviceControl] Screenshot captured and node updated`);
      } else {
        console.error('[@handlers:DeviceControl] Screenshot failed - no data returned');
      }
    } catch (error) {
      console.error('[@handlers:DeviceControl] Error taking screenshot:', error);
    }
  };

  // Handle verification execution using verification server route
  const handleVerification = async (nodeId: string, verifications: any[]) => {
    if (!isVerificationActive || !verifications || verifications.length === 0) {
      console.log('[@handlers:DeviceControl] Verification not active or no verifications provided');
      return;
    }

    try {
      console.log(
        `[@handlers:DeviceControl] Executing verification for node: ${nodeId}, verifications count: ${verifications.length}`,
      );

      // Clear previous results and set current node
      onSetVerificationResults([]);
      onSetLastVerifiedNodeId(nodeId);

      // Use server route instead of verification controller proxy
      if (!selectedHost) {
        throw new Error('No host selected for verification operation');
      }

      console.log('[@handlers:DeviceControl] Using server route for verification execution...');

      // Call execute-batch verification server route
      const response = await fetch(`/server/verification/execute-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: selectedHost.host_name,
          verifications: verifications,
          model: selectedHost?.model || 'android_mobile',
          node_id: nodeId,
          source_filename: 'current_screenshot.jpg',
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.results) {
        console.log(
          '[@handlers:DeviceControl] Verification completed successfully, processing results...',
        );

        // Process results to match VerificationTestResult interface
        const processedResults = result.data.results.map((result: any, index: number) => {
          console.log(
            `[@handlers:DeviceControl] Processing verification result ${index + 1}/${verifications.length}:`,
            {
              success: result.success,
              message: result.message,
              error: result.error,
            },
          );

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

          console.log(`[@handlers:DeviceControl] Processed result ${index + 1}:`, processedResult);
          return processedResult;
        });

        console.log('[@handlers:DeviceControl] All verification results processed, updating state');
        onSetVerificationResults(processedResults);

        // Show summary like in NodeVerificationsList
        if (result.data.results) {
          const passed = result.data.results.filter((r: any) => r.success).length;
          const total = result.data.results.length;

          console.log(`[@handlers:DeviceControl] Verification summary: ${passed}/${total} passed`);

          // Log final result based on pass condition
          const finalPassed = verificationPassCondition === 'all' ? passed === total : passed > 0;

          console.log(
            `[@handlers:DeviceControl] Final result (${verificationPassCondition} condition): ${finalPassed ? 'PASSED' : 'FAILED'}`,
          );
        }
      } else {
        console.error('[@handlers:DeviceControl] Verification failed:', result.error);
        onSetVerificationResults([]);
      }
    } catch (error) {
      console.error('[@handlers:DeviceControl] Verification execution error:', error);
      onSetVerificationResults([]);
    }
  };

  return {
    handleTakeScreenshot,
    handleVerification,
  };
};
