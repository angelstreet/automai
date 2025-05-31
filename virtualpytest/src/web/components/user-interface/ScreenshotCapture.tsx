import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';

interface ScreenshotCaptureProps {
  screenshotPath?: string;
  isCapturing?: boolean;
  isSaving?: boolean;
  resolutionInfo?: {
    device: { width: number; height: number } | null;
    capture: string | null;
    stream: string | null;
  };
  sx?: any;
}

export function ScreenshotCapture({
  screenshotPath,
  isCapturing,
  isSaving,
  resolutionInfo,
  sx = {}
}: ScreenshotCaptureProps) {
  // Memoize the image URL to prevent multiple re-calculations (same logic as original)
  const imageUrl = useMemo(() => {
    if (!screenshotPath) return '';
    
    console.log(`[@component:ScreenshotCapture] Processing image path: ${screenshotPath}`);
    
    // Handle data URLs (base64 from remote system) - return as is
    if (screenshotPath.startsWith('data:')) {
      console.log('[@component:ScreenshotCapture] Using data URL from remote system');
      return screenshotPath;
    }
    
    // Generate a cache-busting timestamp for file-based screenshots
    const timestamp = new Date().getTime();
    
    // For FFmpeg screenshots stored locally in /tmp/screenshots/ (full path)
    if (screenshotPath.includes('/tmp/screenshots/')) {
      const filename = screenshotPath.split('/').pop()?.split('?')[0];
      console.log(`[@component:ScreenshotCapture] Using FFmpeg screenshot: ${filename}`);
      
      if (!filename) {
        console.error(`[@component:ScreenshotCapture] Failed to extract filename from path: ${screenshotPath}`);
        return '';
      }
      
      const finalUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images/screenshot/${filename}?t=${timestamp}`;
      console.log(`[@component:ScreenshotCapture] Generated image URL: ${finalUrl}`);
      return finalUrl;
    }
    
    // For just a filename (like android_mobile.jpg) - assume it's in /tmp/screenshots/
    if (!screenshotPath.includes('/') && screenshotPath.endsWith('.jpg')) {
      const filename = screenshotPath.split('?')[0];
      console.log(`[@component:ScreenshotCapture] Using filename screenshot: ${filename}`);
      
      const finalUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images/screenshot/${filename}?t=${timestamp}`;
      console.log(`[@component:ScreenshotCapture] Generated image URL from filename: ${finalUrl}`);
      return finalUrl;
    }
    
    // If it's already a full URL (but without timestamp)
    if (screenshotPath.startsWith('http') && !screenshotPath.includes('?t=')) {
      const finalUrl = `${screenshotPath}?t=${timestamp}`;
      console.log(`[@component:ScreenshotCapture] Added timestamp to URL: ${finalUrl}`);
      return finalUrl;
    }
    
    // If it's already a full URL with timestamp, return as is
    if (screenshotPath.startsWith('http') && screenshotPath.includes('?t=')) {
      console.log(`[@component:ScreenshotCapture] Using existing URL with timestamp: ${screenshotPath}`);
      return screenshotPath;
    }
    
    // Default case - convert to API endpoint URL
    const cleanPath = screenshotPath.split('?')[0];
    const finalUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(cleanPath)}&t=${timestamp}`;
    console.log(`[@component:ScreenshotCapture] Generated default URL: ${finalUrl}`);
    return finalUrl;
  }, [screenshotPath]);

  return (
    <Box sx={{ 
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      overflow: 'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      ...sx 
    }}>
      {/* Screenshot display - only shown when not capturing */}
      {screenshotPath && imageUrl && !isCapturing && (
        <img 
          src={imageUrl}
          alt="Screenshot"
          style={{
            maxWidth: 'auto',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            backgroundColor: 'transparent'
          }}
          draggable={false}
          onError={(e) => {
            const imgSrc = (e.target as HTMLImageElement).src;
            console.error(`[@component:ScreenshotCapture] Failed to load image: ${imgSrc}`);
            
            // Set a transparent fallback image
            (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
            
            // Add placeholder styling
            const img = e.target as HTMLImageElement;
            img.style.backgroundColor = 'transparent';
            img.style.border = '1px solid #E0E0E0';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.objectFit = 'contain';
            img.style.padding = '4px';
          }}
        />
      )}

      {/* Loading state when capturing or saving */}
      {(isCapturing || isSaving) && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 10
        }}>
          {/* Simple carousel-style loading */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center'
          }}>
            {[0, 1, 2].map((index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isSaving ? '#4caf50' : '#ffffff',
                  animation: 'pulse 1.4s ease-in-out infinite both',
                  animationDelay: `${index * 0.16}s`,
                  '@keyframes pulse': {
                    '0%, 80%, 100%': {
                      transform: 'scale(0)',
                      opacity: 0.5,
                    },
                    '40%': {
                      transform: 'scale(1)',
                      opacity: 1,
                    },
                  },
                }}
              />
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: '#ffffff', textAlign: 'center', mt: 2 }}>
            {isSaving ? 'Saving frames...' : 'Capturing frames...Press stop to stop capturing'}
          </Typography>
        </Box>
      )}

      {/* Placeholder when no screenshot and not capturing */}
      {!screenshotPath && !isCapturing && (
        <Box sx={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          border: '1px solid #333333',
          p: 0.5,
        }}>
          <Typography variant="caption" sx={{ color: '#666666' }}>
            No Screenshot Available
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default ScreenshotCapture; 