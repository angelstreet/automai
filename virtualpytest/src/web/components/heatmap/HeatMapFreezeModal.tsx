import { Close as CloseIcon } from '@mui/icons-material';
import { Modal, Box, IconButton, Typography } from '@mui/material';
import React from 'react';

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

  // Use existing MonitoringAnalysis fields instead of freeze_details
  const analysisJson = freezeModalImage.analysis_json;
  if (!analysisJson || !analysisJson.freeze) return null;

  const framesCompared = analysisJson.last_3_filenames || [];
  const frameDifferences = analysisJson.freeze_diffs || [];

  // Only show modal if we have frame data
  if (framesCompared.length === 0) return null;

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
          {framesCompared.map((filename, index) => {
            // Extract just the filename if it's a full path
            const cleanFilename = filename.includes('/')
              ? filename.split('/').pop() || filename
              : filename;
            const frameUrl = constructFrameUrl(cleanFilename, freezeModalImage.image_url);
            const diff = frameDifferences[index];

            // Extract timestamp from filename (assuming format: capture_YYYYMMDDHHMMSS.jpg)
            const timestampMatch = cleanFilename.match(/capture_(\d{14})/);
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
                    objectFit: 'contain', // Keep original size and aspect ratio
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
