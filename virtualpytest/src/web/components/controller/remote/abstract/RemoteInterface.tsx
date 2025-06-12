import { Box } from '@mui/material';
import { RemoteConfig } from '../../../types/controller/Remote_Types';

interface RemoteInterfaceProps {
  remoteConfig: RemoteConfig | null;
  scale?: number;
  showOverlays?: boolean;
  onCommand?: (command: string, params?: any) => void;
  fallbackImageUrl?: string;
  fallbackName?: string;
}

export function RemoteInterface({
  remoteConfig,
  scale = 1,
  fallbackImageUrl = '/generic-remote.png',
  fallbackName = 'Remote Control'
}: RemoteInterfaceProps) {

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
        src={remoteConfig?.icon || fallbackImageUrl}
        alt={remoteConfig?.name || fallbackName}
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
          e.currentTarget.style.width = `300px`;
          e.currentTarget.style.height = `600px`;
          e.currentTarget.style.backgroundColor = '#2a2a2a';
        }}
      />
      
      {/* Button overlays positioned absolutely over the image */}
      {/* Note: RemoteConfig doesn't have button_layout, so this will be empty for now */}
    </Box>
  );
} 