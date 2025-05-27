import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  Chip,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

import { useAndroidMobileConnection } from '../hooks/useAndroidMobileConnection';
import { AndroidElement } from '../types';

interface AndroidMobileModalProps {
  open: boolean;
  onClose: () => void;
}

export const AndroidMobileModal: React.FC<AndroidMobileModalProps> = ({ open, onClose }) => {
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    androidElements,
    androidApps,
    androidScreenshot,
    handleConnect,
    handleDisconnect,
    handleCommand,
    handleDumpUI,
    handleClickElement,
    handleGetApps,
    handleScreenshot,
    clearElements,
    fetchDefaultValues,
  } = useAndroidMobileConnection();

  // Local state for dropdown selections
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
  }, [open, fetchDefaultValues]);

  // Reset selections when modal closes or disconnects
  useEffect(() => {
    if (!open || !session.connected) {
      setSelectedApp('');
      setSelectedElement('');
      setIsDumpingUI(false);
      setDumpError(null);
    }
  }, [open, session.connected]);

  const handleCloseModal = () => {
    if (session.connected) {
      handleDisconnect();
    }
    onClose();
  };

  // Get the most meaningful identifier for display
  const getElementDisplayName = (el: AndroidElement) => {
    if (el.contentDesc && el.contentDesc !== '<no content-desc>') {
      return `${el.contentDesc}`;
    }
    if (el.text && el.text !== '<no text>') {
      return `"${el.text}"`;
    }
    if (el.resourceId && el.resourceId !== '<no resource-id>') {
      return `ID: ${el.resourceId}`;
    }
    return `${el.tag}`;
  };

  // Enhanced dump UI handler with loading state
  const handleDumpUIWithLoading = async () => {
    setIsDumpingUI(true);
    setDumpError(null);
    try {
      await handleDumpUI();
      console.log('UI dump completed, elements found:', androidElements.length);
      
      // Check if no elements were found after a successful dump
      if (androidElements.length === 0) {
        setDumpError('No UI elements found on the current screen. The screen might be empty or the app might not be responding.');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to dump UI';
      setDumpError(errorMessage);
      console.error('UI dump failed:', error);
    } finally {
      setIsDumpingUI(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseModal}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minHeight: 24 }}>
          {/* Left side: Title and status */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="span" sx={{ fontSize: '1.1rem' }}>
              Android Mobile Remote
            </Typography>
            {session.connected && (
              <Chip 
                label="Connected" 
                color="success" 
                size="small"
              />
            )}
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pb: 0.5, overflow: 'hidden', maxHeight: 'none' }}>
        {!session.connected ? (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter SSH and ADB connection details to take control of the Android Mobile device.
            </Typography>
            
            {connectionError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {connectionError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="SSH Host IP"
                  value={connectionForm.host_ip}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_ip: e.target.value }))}
                  placeholder="77.56.53.130"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SSH Port"
                  value={connectionForm.host_port}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_port: e.target.value }))}
                  placeholder="22"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SSH Username"
                  value={connectionForm.host_username}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_username: e.target.value }))}
                  placeholder="root"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SSH Password"
                  type="password"
                  value={connectionForm.host_password}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_password: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Android Device IP"
                  value={connectionForm.device_ip}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, device_ip: e.target.value }))}
                  placeholder="192.168.1.101"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ADB Port"
                  value={connectionForm.device_port}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, device_port: e.target.value }))}
                  placeholder="5555"
                />
              </Grid>
            </Grid>

            {/* Connection Actions */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseModal}>
                Close
              </Button>
              <Button 
                variant="contained" 
                onClick={handleConnect}
                disabled={connectionLoading || !connectionForm.host_ip || !connectionForm.host_username || !connectionForm.host_password || !connectionForm.device_ip}
              >
                {connectionLoading ? <CircularProgress size={20} /> : 'Take Control'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ pt: 1, height: '80vh' }}>
            {/* Left Column: Device Screen Canvas */}
            <Grid item xs={6}>
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%'
              }}>
                
                {/* Device Screen Canvas */}
                <Box sx={{ 
                  position: 'relative',
                  width: 300,
                  height: 500,
                  border: '2px solid #333',
                  borderRadius: '20px',
                  backgroundColor: '#000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {/* Screenshot or placeholder */}
                  {androidScreenshot ? (
                    <img 
                      src={`data:image/png;base64,${androidScreenshot}`}
                      alt="Device Screenshot"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <>
                      <Typography variant="body2" color="white" sx={{ textAlign: 'center', mb: 2 }}>
                        Device Screen
                      </Typography>
                      <Typography variant="caption" color="gray" sx={{ textAlign: 'center' }}>
                        Use "Screenshot" to capture current screen
                      </Typography>
                    </>
                  )}
                  
                  {/* UI Elements Overlay */}
                  {androidElements.length > 0 && (
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}>
                      {/* Render UI element overlays here */}
                      {androidElements.slice(0, 10).map((element, index) => (
                        <Box
                          key={element.id}
                          sx={{
                            position: 'absolute',
                            left: `${10 + (index % 3) * 30}%`,
                            top: `${20 + Math.floor(index / 3) * 15}%`,
                            width: '25%',
                            height: '10%',
                            border: '1px solid rgba(255, 255, 0, 0.8)',
                            backgroundColor: 'rgba(255, 255, 0, 0.2)',
                            fontSize: '8px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            overflow: 'hidden'
                          }}
                        >
                          #{element.id}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Right Column: Mobile Features */}
            <Grid item xs={6}>
              {/* Screenshot Section */}
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleScreenshot}
                  fullWidth
                >
                  Take Screenshot
                </Button>
              </Box>

              {/* App Launcher Section */}
              <Box sx={{ mb: 3 }}>
               
                <Box sx={{ mb: 2 }}>
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
                          handleCommand('LAUNCH_APP', { package: appPackage });
                          // Clear selection after launching
                          setTimeout(() => setSelectedApp(''), 1000);
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
                  variant="contained"
                  size="small"
                  onClick={handleGetApps}
                  fullWidth
                >
                  Refresh Apps
                </Button>
              </Box>

              {/* UI Elements Section */}
              <Box sx={{ mb: 3 }}>
           
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleDumpUIWithLoading}
                    disabled={isDumpingUI}
                    sx={{ flex: 1 }}
                  >
                    {isDumpingUI ? <CircularProgress size={16} /> : 'Dump UI'}
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

                {/* Show error if dump failed */}
                {dumpError && (
                  <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>
                    {dumpError}
                  </Alert>
                )}
                
                {/* Always show element selection dropdown */}
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Select element to click...</InputLabel>
                  <Select
                    value={selectedElement}
                    label="Select element to click..."
                    disabled={androidElements.length === 0}
                    onChange={(e) => {
                      const elementId = parseInt(e.target.value as string);
                      const element = androidElements.find(el => el.id === elementId);
                      if (element) {
                        setSelectedElement(element.id.toString());
                        handleClickElement(element);
                        // Clear selection after clicking
                        setTimeout(() => setSelectedElement(''), 1000);
                      }
                    }}
                  >
                    {androidElements.length === 0 ? (
                      <MenuItem disabled value="">
                        No elements found - Click "Dump UI" first
                      </MenuItem>
                    ) : (
                      androidElements.map((element) => (
                        <MenuItem key={element.id} value={element.id}>
                          #{element.id}: {getElementDisplayName(element)}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                {/* Show detailed elements list when available */}
                {androidElements.length > 0 && (
                  <Box sx={{ 
                    maxHeight: 200, 
                    overflow: 'auto', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1,
                    p: 1,
                    backgroundColor: '#f9f9f9'
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
                      Dumped UI Elements:
                    </Typography>
                    {androidElements.map((element, index) => (
                      <Box 
                        key={element.id} 
                        sx={{ 
                          mb: 1, 
                          p: 1, 
                          backgroundColor: 'white',
                          borderRadius: 0.5,
                          border: '1px solid #e0e0e0',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          #{element.id} - {element.tag}
                        </Typography>
                        {element.text && element.text !== '<no text>' && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            Text: "{element.text}"
                          </Typography>
                        )}
                        {element.contentDesc && element.contentDesc !== '<no content-desc>' && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            Desc: {element.contentDesc}
                          </Typography>
                        )}
                        {element.resourceId && element.resourceId !== '<no resource-id>' && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            ID: {element.resourceId}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          Bounds: {element.bounds} | Clickable: {element.clickable ? 'Yes' : 'No'} | Enabled: {element.enabled ? 'Yes' : 'No'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Show status when no elements but dump was attempted */}
               
                
                {/* Mobile Phone Controls */}
                <Box sx={{ mt: 2 }}>
                  {/* System buttons */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleCommand('BACK')}
                      sx={{ flex: 1 }}
                    >
                      Back
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleCommand('HOME')}
                      sx={{ flex: 1 }}
                    >
                      Home
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleCommand('MENU')}
                      sx={{ flex: 1 }}
                    >
                      Menu
                    </Button>
                  </Box>
                  
                  {/* Volume controls */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleCommand('VOLUME_DOWN')}
                      sx={{ flex: 1 }}
                    >
                      Vol -
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleCommand('VOLUME_UP')}
                      sx={{ flex: 1 }}
                    >
                      Vol +
                    </Button>
                  </Box>
                </Box>
                
                {/* Modal Controls */}
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="outlined"
                      onClick={handleCloseModal}
                      sx={{ flex: 1 }}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error"
                      onClick={handleDisconnect}
                      disabled={connectionLoading}
                      sx={{ flex: 1 }}
                    >
                      {connectionLoading ? <CircularProgress size={20} /> : 'Release Control'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}; 