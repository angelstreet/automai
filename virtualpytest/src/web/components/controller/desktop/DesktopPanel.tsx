import {
  OpenInFull,
  CloseFullscreen,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React, { useState, useMemo } from 'react';

import { Host } from '../../../types/common/Host_Types';

import { BashDesktopTerminal } from './BashDesktopTerminal';

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

  // Simple panel dimensions
  const collapsedWidth = '400px';
  const collapsedHeight = '300px';
  const expandedWidth = '600px';
  const expandedHeight = '500px';
  const headerHeight = '48px';

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
        return (
          <BashDesktopTerminal
            host={host}
            deviceId={deviceId}
            onDisconnectComplete={onReleaseControl}
            isCollapsed={isCollapsed}
            panelWidth={currentWidth}
            panelHeight={currentHeight}
            streamContainerDimensions={streamContainerDimensions}
          />
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
            Desktop Terminal
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
