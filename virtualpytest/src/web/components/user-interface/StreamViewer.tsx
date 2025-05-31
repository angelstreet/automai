import React, { useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface StreamViewerProps {
  streamUrl?: string;
  isStreamActive?: boolean;
  onRestartStream?: () => void;
  sx?: any;
}

export function StreamViewer({
  streamUrl,
  isStreamActive = false,
  onRestartStream,
  sx = {}
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Debug stream URL
  useEffect(() => {
    console.log(`[@component:StreamViewer] Stream URL: ${streamUrl}`);
    console.log(`[@component:StreamViewer] Stream Active: ${isStreamActive}`);
  }, [streamUrl, isStreamActive]);

  // Load video stream when available
  useEffect(() => {
    if (videoRef.current && streamUrl && isStreamActive) {
      const video = videoRef.current;
      
      console.log(`[@component:StreamViewer] Loading stream: ${streamUrl}`);
      
      // Set video source and try to load
      video.src = streamUrl;
      video.load();
      
      // Add event listeners for debugging
      const handleLoadStart = () => console.log('[@component:StreamViewer] Video load started');
      const handleCanPlay = () => console.log('[@component:StreamViewer] Video can play');
      const handlePlaying = () => console.log('[@component:StreamViewer] Video is playing');
      const handleError = (e: any) => console.error('[@component:StreamViewer] Video error:', e.target.error);
      
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('error', handleError);
      
      // Try to play
      video.play().catch(error => {
        console.error('[@component:StreamViewer] Failed to play video:', error);
      });
      
      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('error', handleError);
      };
    }
  }, [streamUrl, isStreamActive]);

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      overflow: 'hidden',
      ...sx 
    }}>
      {/* Live stream display */}
      {streamUrl && isStreamActive ? (
        <Box sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              backgroundColor: 'transparent'
            }}
          />
          
         
        </Box>
      ) : (
        /* Stream not available placeholder */
        <Box sx={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          border: '1px solid #333333',
          p: 2,
          gap: 2
        }}>
          {!isStreamActive ? (
            <>
              <Typography variant="h6" sx={{ color: '#666666', textAlign: 'center' }}>
                Stream Offline
              </Typography>
              <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center', mb: 2 }}>
                Start the stream service to view live video
              </Typography>
              
              {/* Restart button when stream is offline */}
              {onRestartStream && (
                <Button
                  variant="contained"
                  onClick={onRestartStream}
                  startIcon={<Refresh />}
                  sx={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    px: 3,
                    py: 1,
                    '&:hover': {
                      backgroundColor: '#45a049',
                    },
                  }}
                >
                  Restart Stream
                </Button>
              )}
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ color: '#666666', textAlign: 'center' }}>
                No Stream URL
              </Typography>
              <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
                Stream URL not configured
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default StreamViewer; 