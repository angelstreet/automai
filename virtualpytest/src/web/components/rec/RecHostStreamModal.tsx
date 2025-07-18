import {
  Close as CloseIcon,
  Tv as TvIcon,
  Analytics as AnalyticsIcon,
  SmartToy as AIIcon,
  Language as WebIcon,
} from '@mui/icons-material';
import { Box, IconButton, Typography, Button, CircularProgress, TextField } from '@mui/material';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { useModal } from '../../contexts/ModalContext';
import { useAIAgent } from '../../hooks/aiagent/useAIAgent';
import { useStream } from '../../hooks/controller';
import { useRec } from '../../hooks/pages/useRec';
import { useDeviceControl } from '../../hooks/useDeviceControl';
import { useToast } from '../../hooks/useToast';
import { Host, Device } from '../../types/common/Host_Types';
import { getZIndex } from '../../utils/zIndexUtils';
import { HLSVideoPlayer } from '../common/HLSVideoPlayer';
import { DesktopPanel } from '../controller/desktop/DesktopPanel';
import { RemotePanel } from '../controller/remote/RemotePanel';
import { WebPanel } from '../controller/web/WebPanel';
import { MonitoringPlayer } from '../monitoring/MonitoringPlayer';

interface RecHostStreamModalProps {
  host: Host;
  device?: Device; // Optional device for device-specific operations
  isOpen: boolean;
  onClose: () => void;
  showRemoteByDefault?: boolean;
}

export const RecHostStreamModal: React.FC<RecHostStreamModalProps> = ({
  host,
  device,
  isOpen,
  onClose,
  showRemoteByDefault = false,
}) => {
  // Early return if not open - prevents hooks from running
  if (!isOpen || !host) return null;

  return (
    <RecHostStreamModalContent
      host={host}
      device={device}
      onClose={onClose}
      showRemoteByDefault={showRemoteByDefault}
    />
  );
};

// Separate component that only mounts when modal is open
const RecHostStreamModalContent: React.FC<{
  host: Host;
  device?: Device;
  onClose: () => void;
  showRemoteByDefault: boolean;
}> = ({ host, device, onClose, showRemoteByDefault }) => {
  // Global modal state
  const { setAnyModalOpen } = useModal();

  // Local state
  const [showRemote, setShowRemote] = useState<boolean>(showRemoteByDefault);
  const [showWeb, setShowWeb] = useState<boolean>(false);
  const [monitoringMode, setMonitoringMode] = useState<boolean>(false);
  const [aiAgentMode, setAiAgentMode] = useState<boolean>(false);

  // Set global modal state when component mounts/unmounts
  useEffect(() => {
    setAnyModalOpen(true);
    return () => {
      setAnyModalOpen(false);
    };
  }, [setAnyModalOpen]);

  // Hooks - now only run when modal is actually open
  const { showError, showWarning } = useToast();

  // Get baseUrlPatterns for monitoring
  const { baseUrlPatterns } = useRec();

  // NEW: Use device control hook (replaces all duplicate control logic)
  const { isControlActive, isControlLoading, controlError, handleToggleControl, clearError } =
    useDeviceControl({
      host,
      device_id: device?.device_id || 'device1',
      sessionId: 'rec-stream-modal-session',
      autoCleanup: true, // Auto-release on unmount
    });

  // Use new stream hook - auto-fetches when host/device_id changes
  const { streamUrl, isLoadingUrl, urlError } = useStream({
    host,
    device_id: device?.device_id || 'device1',
  });

  // AI Agent hook - only active when aiAgentMode is true
  const {
    isExecuting: isAIExecuting,
    taskInput,
    aiPlan,
    isPlanFeasible,
    errorMessage: aiError,
    setTaskInput,
    executeTask: executeAITask,
    clearLog: clearAILog,
  } = useAIAgent({
    host,
    device: device!,
    enabled: aiAgentMode && isControlActive,
  });

  // Stable stream container dimensions to prevent re-renders
  const streamContainerDimensions = useMemo(() => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Modal dimensions (95vw x 90vh)
    const modalWidth = windowWidth * 0.95;
    const modalHeight = windowHeight * 0.9;

    // Header height
    const headerHeight = 48;

    // Use fixed stream area (assume remote might be shown)
    const streamAreaWidth = modalWidth * 0.75;
    const streamAreaHeight = modalHeight - headerHeight;

    // Modal position (centered)
    const modalX = (windowWidth - modalWidth) / 2;
    const modalY = (windowHeight - modalHeight) / 2;

    // Stream container position
    const streamX = modalX;
    const streamY = modalY + headerHeight;

    return {
      width: Math.round(streamAreaWidth),
      height: Math.round(streamAreaHeight),
      x: Math.round(streamX),
      y: Math.round(streamY),
    };
  }, []);

  // Check if this is a desktop device (host_vnc)
  const isDesktopDevice = useMemo(() => {
    return device?.device_id === 'host_vnc' || device?.device_model === 'host_vnc';
  }, [device?.device_id, device?.device_model]);

  // Handle remote/terminal toggle
  const handleToggleRemote = useCallback(() => {
    if (!isControlActive) {
      showWarning('Please take control of the device first');
      return;
    }

    setShowRemote((prev) => !prev);
    console.log(
      `[@component:RecHostStreamModal] ${isDesktopDevice ? 'Terminal' : 'Remote'} panel toggled: ${!showRemote}`,
    );
  }, [isControlActive, showRemote, showWarning, isDesktopDevice]);

  // Handle web panel toggle
  const handleToggleWeb = useCallback(() => {
    if (!isControlActive) {
      showWarning('Please take control of the device first');
      return;
    }

    setShowWeb((prev) => {
      const newWeb = !prev;
      console.log(`[@component:RecHostStreamModal] Web panel toggled: ${newWeb}`);
      return newWeb;
    });
  }, [isControlActive, showWarning]);

  // Handle monitoring mode toggle
  const handleToggleMonitoring = useCallback(() => {
    if (!isControlActive) {
      showWarning('Please take control of the device first to enable monitoring');
      return;
    }

    setMonitoringMode((prev) => {
      const newMode = !prev;
      console.log(`[@component:RecHostStreamModal] Monitoring mode toggled: ${newMode}`);

      // Disable AI agent mode when enabling monitoring
      if (newMode) {
        setAiAgentMode(false);
        // Auto-show remote when enabling monitoring for full control
        if (!showRemote) {
          setShowRemote(true);
        }
      }

      return newMode;
    });
  }, [isControlActive, showRemote, showWarning]);

  // Handle AI agent mode toggle
  const handleToggleAiAgent = useCallback(() => {
    if (!isControlActive) {
      showWarning('Please take control of the device first to enable AI agent');
      return;
    }

    setAiAgentMode((prev) => {
      const newMode = !prev;
      console.log(`[@component:RecHostStreamModal] AI agent mode toggled: ${newMode}`);

      // Disable monitoring mode when enabling AI agent
      if (newMode) {
        setMonitoringMode(false);
        // Clear any previous AI results when toggling
        clearAILog();
      }

      return newMode;
    });
  }, [isControlActive, clearAILog, showWarning]);

  // Stable device resolution to prevent re-renders
  const stableDeviceResolution = useMemo(() => ({ width: 1920, height: 1080 }), []);

  // Check if device is mobile model (consistent with RecHostPreview)
  const isMobileModel = useMemo(() => {
    const model = device?.device_model;
    if (!model) return false;
    const modelLower = model.toLowerCase();
    return modelLower.includes('mobile');
  }, [device?.device_model]);

  // Stable onReleaseControl callback to prevent re-renders
  const handleReleaseControl = useCallback(() => {
    setShowRemote(false);
    setShowWeb(false);
    // Control release handled by useDeviceControl
  }, []);

  // Handle modal close
  const handleClose = useCallback(async () => {
    console.log('[@component:RecHostStreamModal] Closing modal');

    // Reset state (useDeviceControl handles cleanup automatically)
    setShowRemote(false);
    setShowWeb(false);
    setMonitoringMode(false);
    setAiAgentMode(false);
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleClose]);

  // Show control errors
  useEffect(() => {
    if (controlError) {
      showError(controlError);
      clearError();
    }
  }, [controlError, showError, clearError]);

  // Show URL error if stream fetch failed
  useEffect(() => {
    if (urlError) {
      showError(`Stream URL error: ${urlError}`);
    }
  }, [urlError, showError]);

  // Show AI errors
  useEffect(() => {
    if (aiError) {
      showError(`AI Agent error: ${aiError}`);
    }
  }, [aiError, showError]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: getZIndex('MODAL_CONTENT'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
      }}
    >
      <Box
        sx={{
          width: '95vw',
          height: '90vh',
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1,
            backgroundColor: 'grey.800',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '8px 8px 0 0',
            minHeight: 48,
          }}
        >
          <Typography variant="h6" component="h2">
            {device?.device_name || host.host_name} -{' '}
            {monitoringMode ? 'Monitoring' : 'Live Stream'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Take Control Button */}
            <Button
              variant={isControlActive ? 'contained' : 'outlined'}
              size="small"
              onClick={handleToggleControl}
              disabled={isControlLoading}
              startIcon={isControlLoading ? <CircularProgress size={16} /> : <TvIcon />}
              color={isControlActive ? 'success' : 'primary'}
              sx={{
                fontSize: '0.75rem',
                minWidth: 120,
                color: isControlActive ? 'white' : 'inherit',
              }}
              title={
                isControlLoading
                  ? 'Processing...'
                  : isControlActive
                    ? 'Release Control'
                    : 'Take Control'
              }
            >
              {isControlLoading
                ? 'Processing...'
                : isControlActive
                  ? 'Release Control'
                  : 'Take Control'}
            </Button>

            {/* Monitoring Toggle Button */}
            <Button
              variant={monitoringMode ? 'contained' : 'outlined'}
              size="small"
              onClick={handleToggleMonitoring}
              disabled={!isControlActive}
              startIcon={<AnalyticsIcon />}
              color={monitoringMode ? 'warning' : 'primary'}
              sx={{
                fontSize: '0.75rem',
                minWidth: 120,
                color: monitoringMode ? 'white' : 'inherit',
              }}
              title={
                !isControlActive
                  ? 'Take control first to enable monitoring'
                  : monitoringMode
                    ? 'Disable Monitoring'
                    : 'Enable Monitoring'
              }
            >
              {monitoringMode ? 'Stop Monitoring' : 'Monitoring'}
            </Button>

            {/* AI Agent Toggle Button */}
            <Button
              variant={aiAgentMode ? 'contained' : 'outlined'}
              size="small"
              onClick={handleToggleAiAgent}
              disabled={!isControlActive}
              startIcon={<AIIcon />}
              color={aiAgentMode ? 'info' : 'primary'}
              sx={{
                fontSize: '0.75rem',
                minWidth: 120,
                color: aiAgentMode ? 'white' : 'inherit',
              }}
              title={
                !isControlActive
                  ? 'Take control first to enable AI agent'
                  : aiAgentMode
                    ? 'Disable AI Agent'
                    : 'Enable AI Agent'
              }
            >
              {aiAgentMode ? 'Stop AI Agent' : 'AI Agent'}
            </Button>

            {/* Web Panel Toggle Button */}
            {isDesktopDevice && (
              <Button
                variant={showWeb ? 'contained' : 'outlined'}
                size="small"
                onClick={handleToggleWeb}
                disabled={!isControlActive}
                startIcon={<WebIcon />}
                color={showWeb ? 'secondary' : 'primary'}
                sx={{
                  fontSize: '0.75rem',
                  minWidth: 100,
                  color: showWeb ? 'white' : 'inherit',
                }}
                title={
                  !isControlActive
                    ? 'Take control first to use web automation'
                    : showWeb
                      ? 'Hide Web Panel'
                      : 'Show Web Panel'
                }
              >
                {showWeb ? 'Hide Web' : 'Web Panel'}
              </Button>
            )}

            {/* Remote/Terminal Toggle Button */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleToggleRemote}
              disabled={!isControlActive}
              sx={{
                fontSize: '0.75rem',
                minWidth: 100,
                color: 'inherit',
              }}
              title={
                !isControlActive
                  ? `Take control first to use ${isDesktopDevice ? 'terminal' : 'remote'}`
                  : showRemote
                    ? `Hide ${isDesktopDevice ? 'Terminal' : 'Remote'}`
                    : `Show ${isDesktopDevice ? 'Terminal' : 'Remote'}`
              }
            >
              {showRemote
                ? `Hide ${isDesktopDevice ? 'Terminal' : 'Remote'}`
                : `Show ${isDesktopDevice ? 'Terminal' : 'Remote'}`}
            </Button>

            {/* Close Button */}
            <IconButton
              onClick={handleClose}
              sx={{ color: 'grey.300', '&:hover': { color: 'white' } }}
              aria-label="Close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            backgroundColor: 'black',
            position: 'relative',
          }}
        >
          {/* Stream Viewer / Monitoring Player */}
          <Box
            sx={{
              width: (() => {
                if (!isControlActive) return '100%';
                const panelCount = (showRemote ? 1 : 0) + (showWeb ? 1 : 0);
                if (panelCount === 0) return '100%';
                if (panelCount === 1) return '75%';
                return '50%'; // Two panels shown
              })(),
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'black',
            }}
          >
            {monitoringMode && isControlActive ? (
              <MonitoringPlayer
                host={host}
                device={device!}
                baseUrlPattern={baseUrlPatterns.get(`${host.host_name}-${device?.device_id}`)}
              />
            ) : streamUrl ? (
              // Check if this is a VNC device - use iframe instead of HLS player
              device?.device_id === 'host_vnc' ? (
                (() => {
                  const panelCount = (showRemote ? 1 : 0) + (showWeb ? 1 : 0);
                  const hasPanel = panelCount > 0 && isControlActive;

                  return hasPanel ? (
                    // When panel is shown, use scaling approach like RecHostPreview to prevent cropping
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'black',
                        overflow: 'hidden',
                      }}
                    >
                      <iframe
                        src={streamUrl}
                        style={{
                          width: '200%', // Make iframe larger to contain full desktop
                          height: '200%', // Make iframe larger to contain full desktop
                          border: 'none',
                          backgroundColor: '#000',
                          transform: 'scale(0.5)', // Scale down to 50% to fit
                          transformOrigin: 'top left',
                        }}
                        title="VNC Desktop Stream"
                        allow="fullscreen"
                      />
                    </Box>
                  ) : (
                    // When no panel, use full size
                    <iframe
                      src={streamUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: '#000',
                      }}
                      title="VNC Desktop Stream"
                      allow="fullscreen"
                    />
                  );
                })()
              ) : (
                <HLSVideoPlayer
                  streamUrl={streamUrl}
                  isStreamActive={true}
                  isCapturing={false}
                  model={device?.device_model || 'unknown'}
                  layoutConfig={{
                    minHeight: '300px',
                    aspectRatio: isMobileModel ? '9/16' : '16/9',
                    objectFit: 'contain', // Prevent cropping/truncation like in preview grid
                    isMobileModel, // Use our mobile detection result
                  }}
                  isExpanded={false}
                  sx={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              )
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'white',
                }}
              >
                <Typography>
                  {isLoadingUrl
                    ? 'Loading stream...'
                    : urlError
                      ? 'Stream error'
                      : 'No stream available'}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Remote Control Panel or Desktop Terminal */}
          {showRemote && isControlActive && (
            <Box
              sx={{
                width: (() => {
                  const panelCount = (showRemote ? 1 : 0) + (showWeb ? 1 : 0);
                  return panelCount === 2 ? '25%' : '25%'; // 25% each when both panels shown
                })(),
                backgroundColor: 'background.default',
                borderLeft: '1px solid',
                borderColor: 'divider',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              {isDesktopDevice ? (
                <DesktopPanel
                  host={host}
                  deviceId={device?.device_id || 'device1'}
                  deviceModel={device?.device_model || 'host_vnc'}
                  isConnected={isControlActive}
                  onReleaseControl={handleReleaseControl}
                  initialCollapsed={false}
                  streamContainerDimensions={streamContainerDimensions}
                />
              ) : (
                <RemotePanel
                  host={host}
                  deviceId={device?.device_id || 'device1'}
                  deviceModel={device?.device_model || 'unknown'}
                  isConnected={isControlActive}
                  onReleaseControl={handleReleaseControl}
                  initialCollapsed={false}
                  deviceResolution={stableDeviceResolution}
                  streamCollapsed={false}
                  streamMinimized={false}
                  streamContainerDimensions={streamContainerDimensions}
                />
              )}
            </Box>
          )}

          {/* Web Control Panel */}
          {showWeb && isControlActive && isDesktopDevice && (
            <Box
              sx={{
                width: (() => {
                  const panelCount = (showRemote ? 1 : 0) + (showWeb ? 1 : 0);
                  return panelCount === 2 ? '25%' : '25%'; // 25% each when both panels shown
                })(),
                backgroundColor: 'background.default',
                borderLeft: '1px solid',
                borderColor: 'divider',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <WebPanel
                host={host}
                deviceId={device?.device_id || 'device1'}
                deviceModel={device?.device_model || 'host_vnc'}
                isConnected={isControlActive}
                onReleaseControl={handleReleaseControl}
                initialCollapsed={false}
                streamContainerDimensions={streamContainerDimensions}
              />
            </Box>
          )}

          {/* AI Agent Sliding Panel - positioned on the right like monitoring AI query */}
          {aiAgentMode && isControlActive && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                right: 16,
                transform: 'translateY(-50%)',
                zIndex: getZIndex('MODAL_CONTENT'),
                pointerEvents: 'auto',
                width: '380px',
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box sx={{ p: 1 }}>
                {/* Header */}
                <Typography
                  variant="h6"
                  sx={{
                    color: '#ffffff',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <AIIcon />
                  AI Agent
                  {/* Show cross icon when plan is not feasible */}
                  {aiPlan && !isPlanFeasible && (
                    <Box
                      sx={{
                        color: '#f44336',
                        display: 'flex',
                        alignItems: 'center',
                        ml: 1,
                      }}
                    >
                      ✕
                    </Box>
                  )}
                </Typography>

                {/* Task Input */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Enter task (e.g., 'go to live and zap 10 times')"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        executeAITask();
                      }
                    }}
                    disabled={isAIExecuting}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        '& fieldset': {
                          borderColor: '#444',
                        },
                        '&:hover fieldset': {
                          borderColor: '#666',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#2196f3',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#ffffff',
                        '&::placeholder': {
                          color: '#888',
                          opacity: 1,
                        },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={executeAITask}
                    disabled={!taskInput.trim() || isAIExecuting}
                    sx={{
                      backgroundColor: '#2196f3',
                      color: '#ffffff',
                      minWidth: '80px',
                      '&:hover': {
                        backgroundColor: '#1976d2',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: '#444',
                        color: '#888',
                      },
                    }}
                  >
                    {isAIExecuting ? (
                      <CircularProgress size={16} sx={{ color: '#888' }} />
                    ) : (
                      'Execute'
                    )}
                  </Button>
                </Box>

                {/* AI Plan Display */}
                {aiPlan && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      borderRadius: 1,
                      border: `1px solid ${isPlanFeasible ? '#444' : '#f44336'}`,
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Show Analysis when not feasible */}
                    {!isPlanFeasible && (
                      <>
                        <Typography variant="subtitle2" sx={{ color: '#f44336', mb: 1 }}>
                          Task Analysis:
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            backgroundColor: 'rgba(244,67,54,0.1)',
                            borderRadius: 0.5,
                            border: '1px solid rgba(244,67,54,0.3)',
                          }}
                        >
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>
                            {aiPlan.analysis}
                          </Typography>
                        </Box>
                      </>
                    )}

                    {/* Show Plan when feasible */}
                    {isPlanFeasible && (
                      <>
                        <Typography variant="subtitle2" sx={{ color: '#4caf50', mb: 1 }}>
                          AI Execution Plan:
                        </Typography>

                        {/* Analysis */}
                        <Typography variant="body2" sx={{ color: '#cccccc', mb: 1 }}>
                          {aiPlan.analysis}
                        </Typography>

                        {/* Plan Steps */}
                        {aiPlan.plan && aiPlan.plan.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography
                              variant="caption"
                              sx={{ color: '#aaa', mb: 1, display: 'block' }}
                            >
                              Steps ({aiPlan.plan.length}):
                            </Typography>
                            {aiPlan.plan.map((step: any, index: number) => (
                              <Box
                                key={index}
                                sx={{
                                  mb: 1,
                                  p: 1,
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                  borderRadius: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#fff', fontWeight: 'bold' }}
                                >
                                  {step.step}. {step.description}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#aaa', display: 'block', mt: 0.5 }}
                                >
                                  {step.command} {step.params && `| ${JSON.stringify(step.params)}`}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {/* Summary Info */}
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {aiPlan.estimated_time && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#4caf50',
                                backgroundColor: 'rgba(76,175,80,0.1)',
                                px: 1,
                                py: 0.5,
                                borderRadius: 0.5,
                              }}
                            >
                              Time: {aiPlan.estimated_time}
                            </Typography>
                          )}
                          {aiPlan.risk_level && (
                            <Typography
                              variant="caption"
                              sx={{
                                color:
                                  aiPlan.risk_level === 'low'
                                    ? '#4caf50'
                                    : aiPlan.risk_level === 'high'
                                      ? '#f44336'
                                      : '#ff9800',
                                backgroundColor:
                                  aiPlan.risk_level === 'low'
                                    ? 'rgba(76,175,80,0.1)'
                                    : aiPlan.risk_level === 'high'
                                      ? 'rgba(244,67,54,0.1)'
                                      : 'rgba(255,152,0,0.1)',
                                px: 1,
                                py: 0.5,
                                borderRadius: 0.5,
                              }}
                            >
                              Risk: {aiPlan.risk_level}
                            </Typography>
                          )}
                        </Box>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
