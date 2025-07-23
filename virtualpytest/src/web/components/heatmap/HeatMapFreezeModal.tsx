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
          position: 'relative',
          display: 'flex',
          gap: 1,
          p: 1,
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 10,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* 3 Images side by side */}
        {freezeDetails.frames_compared.map((filename, index) => {
          const frameUrl = constructFrameUrl(filename, freezeModalImage.image_url);
          const diff = freezeDetails.frame_differences[index];
          const isCurrentFrame = index === 2;

          return (
            <Box
              key={filename}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                border: isCurrentFrame ? '2px solid red' : '1px solid #333',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'white',
                  textAlign: 'center',
                  p: 0.5,
                  bgcolor: 'rgba(0,0,0,0.7)',
                }}
              >
                {isCurrentFrame ? 'Current' : `Frame -${3 - index}`} ({diff})
              </Typography>
              <img
                src={frameUrl}
                alt={`Frame ${index}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
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
    </Modal>
  );
};
