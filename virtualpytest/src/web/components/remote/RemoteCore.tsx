import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import { RemoteInterface } from './RemoteInterface';
import { RemoteType } from '../../types/remote/remoteTypes';
import { useRemoteConnection } from '../../hooks/remote/useRemoteConnection';
import { getRemoteLayout } from '../../../config/layoutConfig';

interface RemoteCoreProps {
  /** The type of remote device */
  remoteType: RemoteType;
  /** Remote configuration */
  remoteConfig?: any;
  /** Function to handle disconnect */
  onDisconnect: () => void;
  /** Layout style for positioning */
  style?: 'panel' | 'compact';
  /** Custom styling */
  sx?: any;
}

export function RemoteCore({
  remoteType,
  remoteConfig,
  onDisconnect,
  style = 'compact',
  sx = {}
}: RemoteCoreProps) {
  const [showOverlays, setShowOverlays] = useState(false);

  // Use the simplified remote connection hook
  const {
    isLoading,
    error,
    sendCommand,
    hideRemote,
  } = useRemoteConnection(remoteType);

  // Handle disconnect with proper control release
  const handleDisconnect = async () => {
    try {
      console.log(`[@component:RemoteCore] Disconnecting ${remoteType} remote via abstract controller`);
      await hideRemote(); // Hide remote via abstract controller
      onDisconnect();
    } catch (error) {
      console.error(`[@component:RemoteCore] Error during disconnect for ${remoteType}:`, error);
      // Still call parent disconnect even if hide remote fails
      onDisconnect();
    }
  };

  // Handle remote commands
  const handleCommand = async (command: string, params?: any) => {
    console.log(`[@component:RemoteCore] Sending ${remoteType} command: ${command}`, params);
    await sendCommand(command, params);
  };

  // Use default scale from remoteConfig or fallback
  const defaultScale = remoteConfig?.remote_info?.default_scale || 1;

  // Get layout configuration for this remote type
  const remoteLayout = getRemoteLayout(remoteType);
  const containerWidth = remoteLayout.containerWidth * defaultScale;

  // Get fallback values based on remote type
  const getFallbackValues = () => {
    switch (remoteType) {
      case 'android-tv':
        return {
          imageUrl: '/android-tv-remote.png',
          name: 'Android TV Remote'
        };
      case 'android-mobile':
        return {
          imageUrl: '/android-mobile-remote.png',
          name: 'Android Mobile Remote'
        };
      case 'ir':
        return {
          imageUrl: '/ir-remote.png',
          name: 'IR Remote'
        };
      case 'bluetooth':
        return {
          imageUrl: '/bluetooth-remote.png',
          name: 'Bluetooth Remote'
        };
      default:
        return {
          imageUrl: '/generic-remote.png',
          name: 'Remote Control'
        };
    }
  };

  const fallbackValues = getFallbackValues();

  if (style === 'panel') {
    // Panel style (same as compact, but within panel layout)
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        ...sx
      }}>
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 10,
          m: 1
        }}>
          <Button
            variant={showOverlays ? "contained" : "outlined"}
            size="small"
            onClick={() => setShowOverlays(!showOverlays)}
            sx={{ 
              minWidth: 'auto', 
              px: 1, 
              fontSize: '0.7rem',
              opacity: 0.7,
              '&:hover': { opacity: 1 }
            }}
          >
            {showOverlays ? 'Hide Overlay' : 'Show Overlay'}
          </Button>
        </Box>
        
        <Box sx={{ 
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${containerWidth}px`,
        }}>
          <RemoteInterface
            remoteConfig={remoteConfig || null}
            scale={defaultScale}
            showOverlays={showOverlays}
            onCommand={handleCommand}
            fallbackImageUrl={fallbackValues.imageUrl}
            fallbackName={fallbackValues.name}
            remoteType={remoteType}
          />
        </Box>

        <Button 
          variant="contained" 
          color="error"
          onClick={handleDisconnect}
          disabled={isLoading}
          size="small"
          fullWidth
          sx={{ 
            mt: 0, 
            height: '28px',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0
          }}
        >
          {isLoading ? <CircularProgress size={16} /> : 'Disconnect'}
        </Button>
      </Box>
    );
  } else {
    // Compact style (for CompactAndroidTVRemote)
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        ...sx 
      }}>
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 10,
          m: 1
        }}>
          <Button
            variant={showOverlays ? "contained" : "outlined"}
            size="small"
            onClick={() => setShowOverlays(!showOverlays)}
            sx={{ 
              minWidth: 'auto', 
              px: 1, 
              fontSize: '0.7rem',
              opacity: 0.7,
              '&:hover': { opacity: 1 }
            }}
          >
            {showOverlays ? 'Hide Overlay' : 'Show Overlay'}
          </Button>
        </Box>
        
        <Box sx={{ 
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${containerWidth}px`,
        }}>
          <RemoteInterface
            remoteConfig={remoteConfig || null}
            scale={defaultScale}
            showOverlays={showOverlays}
            onCommand={handleCommand}
            fallbackImageUrl={fallbackValues.imageUrl}
            fallbackName={fallbackValues.name}
            remoteType={remoteType}
          />
        </Box>
        <Button 
          variant="contained" 
          color="error"
          onClick={handleDisconnect}
          disabled={isLoading}
          size="small"
          fullWidth
          sx={{ 
            mb: 0, 
            height: '28px',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0
          }}
        >
          {isLoading ? <CircularProgress size={16} /> : 'Disconnect'}
        </Button>
      </Box>
    );
  }
} 