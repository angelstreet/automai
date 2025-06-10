import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Settings,
  Videocam,
} from '@mui/icons-material';
import { useRegistration } from '../../contexts/RegistrationContext';

interface HDMIStreamPanelProps {
  /** Optional pre-configured connection parameters - DEPRECATED with abstract controllers */
  connectionConfig?: {
    stream_path: string;
    video_device: string;
    resolution?: string;
    fps?: number;
  };
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
  /** Compact mode for smaller spaces like NavigationEditor */
  compact?: boolean;
  /** Custom styling */
  sx?: any;
}

interface StreamStats {
  stream_url: string;
  is_streaming: boolean;
  uptime_seconds: number;
  frames_received: number;
  bytes_received: number;
  stream_quality: string;
  stream_fps: number;
}

export function HDMIStreamPanel({
  autoConnect = false,
  compact = false,
  sx = {}
}: HDMIStreamPanelProps) {
  // Use registration context for centralized URL management
  const { selectedHost } = useRegistration();

  // Simplified state - just check if AV controller proxy is available
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Check if AV controller is available
  const isAvailable = selectedHost?.controllerProxies?.av ? true : false;

  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect && !isAvailable) {
      console.log('[@component:HDMIStreamPanel] Auto-connect requested but AV controller not available');
      setConnectionError('AV controller proxy not available for selected host');
    }
  }, [autoConnect, isAvailable]);

  // Connection status display
  if (!isAvailable) {
    return (
      <Box sx={{ 
        p: compact ? 1 : 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        ...sx 
      }}>
        <Typography variant={compact ? "body2" : "h6"} color="textSecondary" gutterBottom>
          AV Controller Not Available
        </Typography>
        {connectionError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, textAlign: 'center' }}>
            {connectionError}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: compact ? 1 : 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'auto',
      ...sx 
    }}>
      {/* Stream Control Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
          AV Stream Viewer
        </Typography>

        {/* Status chips */}
        <Box sx={{ mb: 2 }}>
          <Chip 
            label="Available" 
            color="success" 
            icon={<Settings />} 
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip 
            label="Ready" 
            color="primary" 
            icon={<Videocam />} 
            size="small"
          />
        </Box>

        {/* Stream Display Area */}
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: compact ? '200px' : '300px',
          border: '1px solid #ccc',
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: '#e8f5e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2
        }}>
          <Box sx={{ textAlign: 'center', color: 'success.main', p: 2 }}>
            <Settings sx={{ fontSize: compact ? 32 : 48, mb: 1 }} />
            <Typography variant={compact ? "body2" : "body1"} gutterBottom>
              AV Controller Available
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Use controller proxy methods for AV operations
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 