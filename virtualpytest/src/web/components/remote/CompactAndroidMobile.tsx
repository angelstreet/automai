import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Grid,
  IconButton,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  ArrowBack,
  ArrowForward,
  Home,
  KeyboardReturn,
  VolumeUp,
  VolumeDown,
  PowerSettingsNew,
} from '@mui/icons-material';
import { useRemoteConnection } from '../../hooks/remote/useRemoteConnection';

interface CompactAndroidMobileProps {
  /** Custom styling */
  sx?: any;
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
}

export function CompactAndroidMobile({
  sx = {},
  onDisconnectComplete,
}: CompactAndroidMobileProps) {
  const [lastCommand, setLastCommand] = useState<string>('');

  // Use the simplified remote connection hook
  const {
    isLoading,
    error,
    sendCommand,
    pressKey,
    navigate,
    back,
    home,
    hideRemote,
  } = useRemoteConnection('android-mobile');

  // Handle command with feedback
  const handleCommand = async (commandName: string, command: string, params?: any) => {
    setLastCommand(commandName);
    await sendCommand(command, params);
    setTimeout(() => setLastCommand(''), 1000);
  };

  // Handle key press with feedback
  const handleKeyPress = async (keyName: string, key: string) => {
    setLastCommand(keyName);
    await pressKey(key);
    setTimeout(() => setLastCommand(''), 1000);
  };

  // Handle navigation with feedback
  const handleNavigation = async (direction: 'up' | 'down' | 'left' | 'right') => {
    setLastCommand(direction.toUpperCase());
    await navigate(direction);
    setTimeout(() => setLastCommand(''), 1000);
  };

  // Handle disconnect - updated to use abstract controller
  const handleDisconnect = async () => {
    console.log('[@component:CompactAndroidMobile] Disconnecting remote via abstract controller');
    await hideRemote(); // Hide remote via abstract controller
    if (onDisconnectComplete) {
      onDisconnectComplete();
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      ...sx 
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 1, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'primary.main',
        color: 'primary.contrastText'
      }}>
        <Typography variant="subtitle2" textAlign="center">
          Android Mobile Remote
        </Typography>
        {lastCommand && (
          <Typography variant="caption" textAlign="center" display="block">
            {lastCommand}
          </Typography>
        )}
      </Box>

      {/* Error display */}
      {error && (
        <Box sx={{ p: 1, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="caption">{error}</Typography>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          zIndex: 10,
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 0.5
        }}>
          <CircularProgress size={16} />
        </Box>
      )}

      {/* Remote Controls */}
      <Box sx={{ flex: 1, p: 2 }}>
        {/* Navigation Pad */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" gutterBottom display="block">
            Navigation
          </Typography>
          <Grid container spacing={0.5} sx={{ maxWidth: 120, mx: 'auto' }}>
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <IconButton 
                onClick={() => handleNavigation('up')}
                size="small"
                sx={{ bgcolor: lastCommand === 'UP' ? 'primary.light' : 'transparent' }}
              >
                <ArrowUpward />
              </IconButton>
            </Grid>
            <Grid item xs={4}>
              <IconButton 
                onClick={() => handleNavigation('left')}
                size="small"
                sx={{ bgcolor: lastCommand === 'LEFT' ? 'primary.light' : 'transparent' }}
              >
                <ArrowBack />
              </IconButton>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <IconButton 
                onClick={() => handleCommand('SELECT', 'press_key', { key: 'DPAD_CENTER' })}
                size="small"
                sx={{ 
                  bgcolor: lastCommand === 'SELECT' ? 'primary.light' : 'action.selected',
                  border: '2px solid',
                  borderColor: 'primary.main'
                }}
              >
                ●
              </IconButton>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: 'right' }}>
              <IconButton 
                onClick={() => handleNavigation('right')}
                size="small"
                sx={{ bgcolor: lastCommand === 'RIGHT' ? 'primary.light' : 'transparent' }}
              >
                <ArrowForward />
              </IconButton>
            </Grid>
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <IconButton 
                onClick={() => handleNavigation('down')}
                size="small"
                sx={{ bgcolor: lastCommand === 'DOWN' ? 'primary.light' : 'transparent' }}
              >
                <ArrowDownward />
              </IconButton>
            </Grid>
          </Grid>
        </Box>

        {/* System Keys */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" gutterBottom display="block">
            System
          </Typography>
          <Grid container spacing={0.5}>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<Home />}
                onClick={() => {
                  setLastCommand('HOME');
                  home();
                  setTimeout(() => setLastCommand(''), 1000);
                }}
                sx={{ 
                  fontSize: '0.7rem',
                  bgcolor: lastCommand === 'HOME' ? 'primary.light' : 'transparent'
                }}
              >
                Home
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<KeyboardReturn />}
                onClick={() => {
                  setLastCommand('BACK');
                  back();
                  setTimeout(() => setLastCommand(''), 1000);
                }}
                sx={{ 
                  fontSize: '0.7rem',
                  bgcolor: lastCommand === 'BACK' ? 'primary.light' : 'transparent'
                }}
              >
                Back
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Volume Controls */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" gutterBottom display="block">
            Volume
          </Typography>
          <Grid container spacing={0.5}>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<VolumeUp />}
                onClick={() => handleKeyPress('VOL+', 'VOLUME_UP')}
                sx={{ 
                  fontSize: '0.7rem',
                  bgcolor: lastCommand === 'VOL+' ? 'primary.light' : 'transparent'
                }}
              >
                Vol+
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<VolumeDown />}
                onClick={() => handleKeyPress('VOL-', 'VOLUME_DOWN')}
                sx={{ 
                  fontSize: '0.7rem',
                  bgcolor: lastCommand === 'VOL-' ? 'primary.light' : 'transparent'
                }}
              >
                Vol-
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Power */}
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<PowerSettingsNew />}
            onClick={() => handleKeyPress('POWER', 'POWER')}
            sx={{ 
              fontSize: '0.7rem',
              bgcolor: lastCommand === 'POWER' ? 'primary.light' : 'transparent'
            }}
          >
            Power
          </Button>
        </Box>
      </Box>

      {/* Disconnect button */}
      <Button 
        variant="contained" 
        color="error"
        onClick={handleDisconnect}
        size="small"
        fullWidth
        sx={{ 
          m: 1,
          height: '32px',
          fontSize: '0.75rem'
        }}
      >
        Disconnect
      </Button>
    </Box>
  );
} 