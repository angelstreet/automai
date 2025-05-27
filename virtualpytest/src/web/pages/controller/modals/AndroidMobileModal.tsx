import React, { useEffect } from 'react';
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

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
  }, [open, fetchDefaultValues]);

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

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseModal}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minHeight: 40 }}>
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
      <DialogContent sx={{ pb: 1, overflow: 'hidden', maxHeight: 'none' }}>
        {!session.connected ? (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
            <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
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
          <Grid container spacing={3} sx={{ pt: 2, height: '80vh' }}>
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
                <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem' }}>
                  📱 App Launcher {androidApps.length > 0 && `(${androidApps.length})`}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select an app...</InputLabel>
                    <Select
                      value=""
                      label="Select an app..."
                      disabled={androidApps.length === 0}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleCommand('LAUNCH_APP', { package: e.target.value });
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
                <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem' }}>
                  🔍 UI Elements {androidElements.length > 0 && `(${androidElements.length})`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleDumpUI}
                    sx={{ flex: 1 }}
                  >
                    Dump UI
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
                
                {/* Element Selection and Click */}
                {androidElements.length > 0 && (
                  <Box>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Select element to click...</InputLabel>
                      <Select
                        value=""
                        label="Select element to click..."
                        onChange={(e) => {
                          const elementId = parseInt(e.target.value as string);
                          const element = androidElements.find(el => el.id === elementId);
                          if (element) {
                            handleClickElement(element);
                          }
                        }}
                      >
                        {androidElements.map((element) => (
                          <MenuItem key={element.id} value={element.id}>
                            #{element.id}: {getElementDisplayName(element)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}
                
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