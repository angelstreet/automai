import {
  OpenInFull,
  CloseFullscreen,
  KeyboardArrowDown,
  KeyboardArrowUp,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography, Divider } from '@mui/material';
import React, { useState, useMemo } from 'react';

import { Host } from '../../../types/common/Host_Types';

import { BashDesktopTerminal } from './BashDesktopTerminal';
import { PyAutoGUITerminal } from './PyAutoGUITerminal';

interface DesktopPanelProps {
  host: Host;
  deviceId: string;
  deviceModel: string;
  isConnected?: boolean;
  onReleaseControl?: () => void;
  initialCollapsed?: boolean;
  streamContainerDimensions?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const DesktopPanel = React.memo(function DesktopPanel({
  host,
  deviceId,
  deviceModel,
  onReleaseControl,
  initialCollapsed = true,
  streamContainerDimensions,
}: DesktopPanelProps) {
  // Panel state - three states: expanded, collapsed, minimized
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isMinimized, setIsMinimized] = useState(false);

  // Section collapse states for split layout
  const [bashCollapsed, setBashCollapsed] = useState(false);
  const [pyAutoGUICollapsed, setPyAutoGUICollapsed] = useState(false);

  // Updated panel dimensions for split layout with dynamic space allocation
  const collapsedWidth = '420px';
  const collapsedHeight = '450px';
  const expandedWidth = '520px';
  const expandedHeight = '650px';
  const headerHeight = '48px';
  const sectionHeaderHeight = '32px';

  // Current panel dimensions based on state
  const currentWidth = isCollapsed ? collapsedWidth : expandedWidth;
  const currentHeight = isMinimized ? headerHeight : isCollapsed ? collapsedHeight : expandedHeight;

  // Smart toggle handlers with minimized state logic
  const handleMinimizeToggle = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsCollapsed(true);
    } else {
      setIsMinimized(true);
    }
  };

  const handleExpandCollapseToggle = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsCollapsed(true);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Build position styles - detect modal context
  const positionStyles: any = streamContainerDimensions
    ? {
        position: 'relative',
        width: '100%',
        height: '100%',
      }
    : {
        position: 'fixed',
        zIndex: 1300,
        bottom: '20px',
        right: '20px',
      };

  const renderDesktopComponent = useMemo(() => {
    switch (deviceModel) {
      case 'host_vnc':
        // Calculate dynamic heights based on collapse states
        const headerHeightNum = parseInt(sectionHeaderHeight.replace('px', ''));
        const mainHeaderHeight = parseInt(headerHeight.replace('px', ''));
        const totalAvailableHeight = parseInt(
          (isCollapsed ? collapsedHeight : expandedHeight).replace('px', ''),
        );
        const reservedForHeaders = mainHeaderHeight + headerHeightNum * 2; // Main header + two section headers
        const contentHeight = totalAvailableHeight - reservedForHeaders;

        let pyAutoGUIHeight = 0;
        let bashHeight = 0;

        if (!pyAutoGUICollapsed && !bashCollapsed) {
          // Both expanded: split the space intelligently
          pyAutoGUIHeight = Math.max(200, Math.floor(contentHeight * 0.6)); // 60% for PyAutoGUI, min 200px
          bashHeight = Math.max(150, contentHeight - pyAutoGUIHeight); // 40% for Bash, min 150px
        } else if (!pyAutoGUICollapsed && bashCollapsed) {
          // Only PyAutoGUI expanded: use most of the space
          pyAutoGUIHeight = Math.max(300, contentHeight);
          bashHeight = 0;
        } else if (pyAutoGUICollapsed && !bashCollapsed) {
          // Only Bash expanded: use most of the space
          pyAutoGUIHeight = 0;
          bashHeight = Math.max(200, contentHeight);
        }
        // If both collapsed, heights remain 0

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* PyAutoGUI Section */}
            <Box
              sx={{
                borderBottom: bashCollapsed ? 'none' : '1px solid #333',
                flex: pyAutoGUICollapsed ? '0 0 auto' : '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                overflow: 'hidden',
              }}
            >
              {/* PyAutoGUI Section Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1,
                  py: 0.5,
                  height: sectionHeaderHeight,
                  backgroundColor: '#1a1a2e',
                  color: '#0ff',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onClick={() => setPyAutoGUICollapsed(!pyAutoGUICollapsed)}
              >
                <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                  PyAutoGUI Desktop
                </Typography>
                <IconButton size="small" sx={{ color: '#0ff' }}>
                  {pyAutoGUICollapsed ? (
                    <ExpandMore fontSize="small" />
                  ) : (
                    <ExpandLess fontSize="small" />
                  )}
                </IconButton>
              </Box>

              {/* PyAutoGUI Content */}
              {!pyAutoGUICollapsed && (
                                  <Box
                    sx={{
                      height: `${pyAutoGUIHeight}px`,
                      overflow: 'hidden',
                      flex: '1 1 auto',
                      transition: 'height 0.3s ease-in-out',
                    }}
                  >
                  <PyAutoGUITerminal
                    host={host}
                    deviceId={deviceId}
                    onDisconnectComplete={onReleaseControl}
                  />
                </Box>
              )}
            </Box>

            {/* Bash Section */}
            <Box
              sx={{
                flex: bashCollapsed ? '0 0 auto' : '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                borderTop: pyAutoGUICollapsed ? 'none' : '1px solid #333',
                transition: 'all 0.3s ease-in-out',
                overflow: 'hidden',
              }}
            >
              {/* Bash Section Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1,
                  py: 0.5,
                  height: sectionHeaderHeight,
                  backgroundColor: '#1E1E1E',
                  color: '#00ff00',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onClick={() => setBashCollapsed(!bashCollapsed)}
              >
                <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Bash Terminal
                </Typography>
                <IconButton size="small" sx={{ color: '#00ff00' }}>
                  {bashCollapsed ? (
                    <ExpandMore fontSize="small" />
                  ) : (
                    <ExpandLess fontSize="small" />
                  )}
                </IconButton>
              </Box>

              {/* Bash Content */}
              {!bashCollapsed && (
                                  <Box
                    sx={{
                      height: bashHeight > 0 ? `${bashHeight}px` : 'auto',
                      flex: '1 1 auto',
                      overflow: 'hidden',
                      transition: 'height 0.3s ease-in-out',
                    }}
                  >
                  <BashDesktopTerminal
                    host={host}
                    deviceId={deviceId}
                    onDisconnectComplete={onReleaseControl}
                    isCollapsed={isCollapsed}
                    panelWidth={currentWidth}
                    panelHeight={currentHeight}
                    streamContainerDimensions={streamContainerDimensions}
                  />
                </Box>
              )}
            </Box>
          </Box>
        );
      default:
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 2,
            }}
          >
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Unsupported desktop device: {deviceModel}
            </Typography>
          </Box>
        );
    }
  }, [
    host,
    deviceId,
    deviceModel,
    onReleaseControl,
    isCollapsed,
    currentWidth,
    currentHeight,
    streamContainerDimensions,
    bashCollapsed,
    pyAutoGUICollapsed,
    sectionHeaderHeight,
  ]);

  return (
    <Box sx={positionStyles}>
      {/* Inner content container */}
      <Box
        sx={{
          width: streamContainerDimensions ? '100%' : currentWidth,
          height: streamContainerDimensions ? '100%' : currentHeight,
          position: streamContainerDimensions ? 'relative' : 'absolute',
          ...(streamContainerDimensions
            ? {}
            : {
                bottom: 0,
                right: 0,
              }),
          backgroundColor: 'background.paper',
          border: streamContainerDimensions ? 'none' : '1px solid',
          borderColor: 'divider',
          borderRadius: streamContainerDimensions ? 0 : 1,
          boxShadow: streamContainerDimensions ? 'none' : 3,
          overflow: 'hidden',
          transition: streamContainerDimensions
            ? 'none'
            : 'width 0.3s ease-in-out, height 0.3s ease-in-out',
        }}
      >
        {/* Header with minimize and expand/collapse buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            height: headerHeight,
            borderBottom: isMinimized ? 'none' : '1px solid #333',
            bgcolor: '#1E1E1E',
            color: '#ffffff',
          }}
        >
          {/* Center: Title */}
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 'bold',
              flex: 1,
              textAlign: 'center',
            }}
          >
            Desktop Control Panel
          </Typography>

          {/* Right side: Minimize and Expand/Collapse buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Minimize/Restore button */}
            <Tooltip title={isMinimized ? 'Restore Panel' : 'Minimize Panel'}>
              <IconButton size="small" onClick={handleMinimizeToggle} sx={{ color: 'inherit' }}>
                {isMinimized ? (
                  <KeyboardArrowUp fontSize="small" />
                ) : (
                  <KeyboardArrowDown fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            {/* Expand/Collapse button */}
            <Tooltip
              title={
                isMinimized ? 'Restore Panel' : isCollapsed ? 'Expand Panel' : 'Collapse Panel'
              }
            >
              <IconButton
                size="small"
                onClick={handleExpandCollapseToggle}
                sx={{ color: 'inherit' }}
              >
                {isCollapsed ? (
                  <OpenInFull fontSize="small" />
                ) : (
                  <CloseFullscreen fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Desktop Content - hidden when minimized */}
        {!isMinimized && (
          <Box
            sx={{
              height: `calc(100% - ${headerHeight})`,
              overflow: 'hidden',
            }}
          >
            {renderDesktopComponent}
          </Box>
        )}
      </Box>
    </Box>
  );
});
