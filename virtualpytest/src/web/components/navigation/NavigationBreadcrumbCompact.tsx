import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { ArrowBack, Home, ChevronRight } from '@mui/icons-material';
import { useNavigationStack } from '../../contexts/navigation/NavigationStackContext';

export const NavigationBreadcrumbCompact: React.FC<{ onNavigateBack: () => void }> = ({
  onNavigateBack,
}) => {
  const { stack, isNested, currentLevel } = useNavigationStack();

  if (!isNested || !currentLevel) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 56, // Just under the header (header height is ~48px + some margin)
        left: 16,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '20px',
        padding: '6px 12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        fontSize: '0.8rem',
        maxWidth: 'fit-content',
      }}
    >
      {/* Back Button */}
      <ArrowBack
        sx={{
          fontSize: '14px',
          color: '#666',
          cursor: 'pointer',
          '&:hover': { color: '#2196f3' },
        }}
        onClick={onNavigateBack}
      />

      {/* Home Icon */}
      <Home sx={{ fontSize: '14px', color: '#666', mx: 0.5 }} />

      {/* Root Label */}
      <Typography
        variant="caption"
        sx={{
          color: '#666',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        Main
      </Typography>

      {/* Separator */}
      <ChevronRight sx={{ fontSize: '12px', color: '#999' }} />

      {/* Current Level */}
      <Chip
        label={currentLevel.parentNodeLabel}
        size="small"
        sx={{
          height: '20px',
          fontSize: '0.7rem',
          fontWeight: 600,
          backgroundColor: '#e3f2fd',
          color: '#1976d2',
          '& .MuiChip-label': {
            padding: '0 8px',
          },
        }}
      />
    </Box>
  );
};
