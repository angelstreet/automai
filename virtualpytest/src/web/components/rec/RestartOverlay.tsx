import { Box, Typography } from '@mui/material';
import React from 'react';

interface RestartOverlayProps {
  sx?: any;
  timestamp?: string; // Timestamp to display
}

// Format timestamp from YYYYMMDDHHMMSS to readable format
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp || timestamp.length !== 14) return timestamp;

  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hour = timestamp.slice(8, 10);
  const minute = timestamp.slice(10, 12);
  const second = timestamp.slice(12, 14);

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

export const RestartOverlay: React.FC<RestartOverlayProps> = ({ sx, timestamp }) => {
  return (
    <>
      {/* Timestamp overlay - top right */}
      {timestamp && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 20,
            p: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 1,
            pointerEvents: 'none', // Don't interfere with clicks
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            {formatTimestamp(timestamp)}
          </Typography>
        </Box>
      )}
    </>
  );
};
