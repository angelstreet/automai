import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { AndroidElement } from '../../types/remote/types';

interface AndroidMobileCoreProps {
  session: any;
  connectionLoading: boolean;
  connectionError: string | null;
  dumpError: string | null;
  androidApps: any[];
  androidElements: AndroidElement[];
  isDumpingUI: boolean;
  selectedApp: string;
  selectedElement: string;
  setSelectedApp: (app: string) => void;
  setSelectedElement: (element: string) => void;
  handleGetApps: () => void;
  handleDumpUIWithLoading: () => void;
  clearElements: () => void;
  handleRemoteCommand: (command: string, params?: any) => void;
  handleOverlayElementClick: (element: AndroidElement) => void;
  onDisconnect: () => void;
}

export function AndroidMobileCore({
  session,
  connectionLoading,
  connectionError,
  dumpError,
  androidApps,
  androidElements,
  isDumpingUI,
  selectedApp,
  selectedElement,
  setSelectedApp,
  setSelectedElement,
  handleGetApps,
  handleDumpUIWithLoading,
  clearElements,
  handleRemoteCommand,
  handleOverlayElementClick,
  onDisconnect
}: AndroidMobileCoreProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  const handleDisconnect = () => {
    setIsDisconnecting(true);
    onDisconnect();
  };
  
  // Reset disconnecting state when connection changes
  useEffect(() => {
    if (session.connected) {
      setIsDisconnecting(false);
    }
  }, [session.connected]);
  
  return (
    <Box sx={{ 
      maxWidth: '250px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* App Launcher Section */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          App Launcher ({androidApps.length} apps)
        </Typography>
        
        <Box sx={{ mb: 1, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Select an app...</InputLabel>
            <Select
              value={selectedApp}
              label="Select an app..."
              disabled={androidApps.length === 0}
              onChange={(e) => {
                const appPackage = e.target.value;
                if (appPackage) {
                  setSelectedApp(appPackage);
                  handleRemoteCommand('LAUNCH_APP', { package: appPackage });
                }
              }}
            >
              {androidApps.map((app) => (
                <MenuItem key={app.packageName} value={app.packageName}>
                  {app.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={handleGetApps}
          disabled={!session.connected}
          fullWidth
        >
          Refresh Apps
        </Button>
      </Box>

      {/* UI Elements Section */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          UI Elements ({androidElements.length})
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleDumpUIWithLoading}
            disabled={!session.connected || isDumpingUI}
            sx={{ flex: 1 }}
          >
            {isDumpingUI ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption">Capturing...</Typography>
              </Box>
            ) : (
              'Dump UI'
            )}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={clearElements}
            disabled={androidElements.length === 0}
            sx={{ flex: 1 }}
          >
            Clear
          </Button>
        </Box>

        {/* Element selection dropdown */}
        <FormControl fullWidth size="small">
          <InputLabel>Select element to click...</InputLabel>
          <Select
            value={selectedElement}
            label="Select element to click..."
            disabled={!session.connected || androidElements.length === 0}
            onChange={(e) => {
              const elementId = parseInt(e.target.value as string);
              const element = androidElements.find(el => el.id === elementId);
              if (element) {
                setSelectedElement(element.id.toString());
                handleOverlayElementClick(element);
              }
            }}
          >
            {androidElements.map((element) => {
              const getElementDisplayName = (el: AndroidElement) => {
                if (el.contentDesc && el.contentDesc !== '<no content-desc>') {
                  return `${el.contentDesc} (${el.className})`;
                }
                if (el.text && el.text !== '<no text>') {
                  return `"${el.text}" (${el.className})`;
                }
                if (el.resourceId && el.resourceId !== '<no resource-id>') {
                  return `${el.resourceId} (${el.className})`;
                }
                return `${el.className} #${el.id}`;
              };

              return (
                <MenuItem key={element.id} value={element.id}>
                  {getElementDisplayName(element)}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Device Controls */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Device Controls
        </Typography>
        
        {/* System buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('BACK')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('HOME')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Home
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('MENU')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Menu
          </Button>
        </Box>

        {/* Volume controls */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('VOLUME_UP')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Vol+
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('VOLUME_DOWN')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Vol-
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('POWER')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Power
          </Button>
        </Box>

        {/* Phone specific buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('CAMERA')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Camera
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('CALL')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            Call
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleRemoteCommand('ENDCALL')}
            disabled={!session.connected}
            sx={{ flex: 1 }}
          >
            End
          </Button>
        </Box>
      </Box>

      {/* Error Display Area */}
      {(connectionError || dumpError) && (
        <Box sx={{ mb: 1 }}>
          <Alert severity="error">
            {connectionError || dumpError}
          </Alert>
        </Box>
      )}

      {/* Disconnect Button */}
      <Box sx={{ pt: 1, borderTop: '1px solid #e0e0e0' }}>
        <Button 
          variant="contained" 
          color="error"
          onClick={handleDisconnect}
          disabled={connectionLoading || isDisconnecting}
          fullWidth
        >
          Disconnect
        </Button>
      </Box>
    </Box>
  );
} 