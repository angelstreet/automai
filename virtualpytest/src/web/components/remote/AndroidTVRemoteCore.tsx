import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import { RemoteInterface } from './RemoteInterface';

interface AndroidTVRemoteCoreProps {
  /** Whether device is connected */
  isConnected: boolean;
  /** Remote configuration */
  remoteConfig: any;
  /** Whether connection is loading */
  connectionLoading: boolean;
  /** Function to handle remote commands */
  onCommand: (command: string) => void;
  /** Function to handle disconnect */
  onDisconnect: () => void;
  /** Layout style for positioning */
  style?: 'panel' | 'compact';
  /** Custom styling */
  sx?: any;
}

export function AndroidTVRemoteCore({
  isConnected,
  remoteConfig,
  connectionLoading,
  onCommand,
  onDisconnect,
  style = 'compact',
  sx = {}
}: AndroidTVRemoteCoreProps) {
  const [showOverlays, setShowOverlays] = useState(false);

  // Don't render if not connected
  if (!isConnected) {
    return null;
  }

  // Use default scale from remoteConfig
  const defaultScale = remoteConfig?.remote_info?.default_scale || 1;

  if (style === 'panel') {
    // Panel style (same as compact, but within panel layout)
    const containerWidth = 130 * defaultScale;
    
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
            onCommand={onCommand}
            fallbackImageUrl="/android-tv-remote.png"
            fallbackName="Android TV Remote"
          />
        </Box>

        <Button 
          variant="contained" 
          color="error"
          onClick={onDisconnect}
          disabled={connectionLoading}
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
          {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
        </Button>
      </Box>
    );
  } else {
    // Compact style (for CompactAndroidTVRemote)
    const containerWidth = 130 * defaultScale;
    
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
            onCommand={onCommand}
            fallbackImageUrl="/android-tv-remote.png"
            fallbackName="Android TV Remote"
          />
        </Box>

        <Button 
          variant="contained" 
          color="error"
          onClick={onDisconnect}
          disabled={connectionLoading}
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
          {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
        </Button>
      </Box>
    );
  }
} 