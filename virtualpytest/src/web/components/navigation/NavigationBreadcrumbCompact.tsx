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
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        backgroundColor: '#f5f5f5', // Match navigation header default background
        border: '1px solid #e0e0e0', // Match navigation header border style
        borderRadius: '8px', // Rectangle with round border
        padding: '8px 16px',
        margin: '8px 16px 0 16px', // Top margin for spacing below header, left/right margin for alignment
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)', // Subtle shadow similar to AppBar elevation={1}
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
