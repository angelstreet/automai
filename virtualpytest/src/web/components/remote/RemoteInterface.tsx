import React from 'react';
import { Box } from '@mui/material';
import { RemoteConfig } from '../../types/remote/types';
import { getRemoteLayout } from '../config/layoutConfig';

interface RemoteInterfaceProps {
  remoteConfig: RemoteConfig | null;
  scale: number;
  showOverlays: boolean;
  onCommand: (command: string, params?: any) => void;
  fallbackImageUrl: string;
  fallbackName: string;
  remoteType?: string; // Add remoteType to get proper layout config
}

export const RemoteInterface: React.FC<RemoteInterfaceProps> = ({
  remoteConfig,
  scale,
  showOverlays,
  onCommand,
  fallbackImageUrl,
  fallbackName,
  remoteType,
}) => {
  // Get layout configuration for this remote type
  const remoteLayout = getRemoteLayout(remoteType);

  // Helper function to render a button from configuration
  const renderRemoteButton = (buttonId: string, config: any) => {
    if (!remoteConfig) return null;
    
    const borderRadius = config.shape === 'circle' ? '50%' : config.shape === 'rectangle' ? 2 : '50%';
    
    // Get scaling and offset parameters from remote config
    const buttonScaleFactor = remoteConfig.remote_info.button_scale_factor || 1.0;
    const globalOffset = remoteConfig.remote_info.global_offset || { x: 0, y: 0 };
    const textStyle = remoteConfig.remote_info.text_style || {};
    
    // First apply global offset to button position, then apply scaling
    // This ensures the global_offset can be used to move all buttons together
    const positionWithOffset = {
      x: config.position.x + globalOffset.x,
      y: config.position.y + globalOffset.y
    };
    
    // Apply scaling to the offset position
    const scaledPosition = {
      x: positionWithOffset.x * scale,
      y: positionWithOffset.y * scale
    };
    
    // Apply button scale factor and overall scale to the button size
    const scaledSize = {
      width: config.size.width * buttonScaleFactor * scale,
      height: config.size.height * buttonScaleFactor * scale
    };

    // Determine what text to display
    const displayText = showOverlays ? (config.label || config.key) : '';

    return (
      <Box
        key={buttonId}
        onClick={() => onCommand(config.key, {})}
        sx={{
          position: 'absolute',
          left: scaledPosition.x,
          top: scaledPosition.y,
          width: scaledSize.width,
          height: scaledSize.height,
          borderRadius,
          backgroundColor: showOverlays ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
          border: showOverlays ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: textStyle.fontSize || '10px',
          color: showOverlays ? (textStyle.color || 'white') : 'transparent',
          fontWeight: textStyle.fontWeight || 'bold',
          textShadow: textStyle.textShadow || '1px 1px 2px rgba(0,0,0,0.8)',
          transition: 'all 0.2s ease',
          transform: 'translate(-50%, -50%)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.6)',
            color: textStyle.color || 'white',
          },
        }}
        title={config.comment}
      >
        {displayText}
      </Box>
    );
  };

  return (
    <Box sx={{ 
      position: 'relative',
      transform: `scale(${scale})`,
      transformOrigin: 'center top',
      display: 'inline-block',
      overflow: 'visible',
      marginRight: 3
    }}>
      {/* Remote image */}
      <img 
        src={remoteConfig?.remote_info.image_url || fallbackImageUrl}
        alt={remoteConfig?.remote_info.name || fallbackName}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '6px',
          // Make remote image non-selectable
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          pointerEvents: 'none' // Prevent dragging
        }}
        draggable={false} // Prevent image dragging
        onError={(e) => {
          // Fallback if image doesn't load
          e.currentTarget.style.width = `${remoteLayout.fallbackImageWidth}px`;
          e.currentTarget.style.height = `${remoteLayout.fallbackImageHeight}px`;
          e.currentTarget.style.backgroundColor = '#2a2a2a';
        }}
      />
      
      {/* Button overlays positioned absolutely over the image */}
      {Object.entries(remoteConfig?.button_layout || {}).map(([buttonId, config]) => 
        renderRemoteButton(buttonId, config)
      )}
    </Box>
  );
}; 