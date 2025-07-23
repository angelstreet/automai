import React from 'react';
import { Modal, Box, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { HeatmapImage } from '../../hooks/pages/useHeatmap';

interface HeatMapFreezeModalProps {
  freezeModalOpen: boolean;
  freezeModalImage: HeatmapImage | null;
  onClose: () => void;
  constructFrameUrl: (filename: string, baseUrl: string) => string;
}

export const HeatMapFreezeModal: React.FC<HeatMapFreezeModalProps> = ({
  freezeModalOpen,
  freezeModalImage,
  onClose,
  constructFrameUrl,
}) => {
  if (!freezeModalOpen || !freezeModalImage) return null;

  const freezeDetails = freezeModalImage.analysis_json?.freeze_details;
  if (!freezeDetails) return null;

  return (
    <Modal
      open={freezeModalOpen}
      onClose={onClose}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Box
        sx={{
          width: '90vw',
          height: '70vh',
          bgcolor: 'black',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with close button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            p: 0.25,
            minHeight: '24px',
            bgcolor: 'rgba(0,0,0,0.8)',
          }}
        >
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'white',
              padding: '2px',
              minWidth: '20px',
              minHeight: '20px',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              '& .MuiSvgIcon-root': {
                fontSize: '16px',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* 3 Images side by side */}
        <Box sx={{ display: 'flex', flex: 1, gap: 1, p: 1 }}>
          {freezeDetails.frames_compared.map((filename, index) => {
            const frameUrl = constructFrameUrl(filename, freezeModalImage.image_url);
            const diff = freezeDetails.frame_differences[index];
            
            // Extract timestamp from filename (assuming format: capture_YYYYMMDDHHMMSS.jpg)
            const timestampMatch = filename.match(/capture_(\d{14})/);
            const timestamp = timestampMatch ? timestampMatch[1] : '';
            
            // Format timestamp to readable format
            const formatTimestamp = (ts: string) => {
              if (ts.length !== 14) return ts;
              const year = ts.substring(0, 4);
              const month = ts.substring(4, 6);
              const day = ts.substring(6, 8);
              const hour = ts.substring(8, 10);
              const minute = ts.substring(10, 12);
              const second = ts.substring(12, 14);
              return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
            };

            return (
              <Box
                key={filename}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'white',
                    textAlign: 'center',
                    p: 0.5,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    fontSize: '0.75rem',
                  }}
                >
                  {timestamp ? formatTimestamp(timestamp) : `Frame ${index + 1}`} - Frame ({diff})
                </Typography>
                <img
                  src={frameUrl}
                  alt={`Frame ${index}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover', // Fill the space
                  }}
                  onError={(e) => {
                    // Try thumbnail version if original fails
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('_thumbnail')) {
                      target.src = frameUrl.replace('.jpg', '_thumbnail.jpg');
                    }
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    </Modal>
  );
};
