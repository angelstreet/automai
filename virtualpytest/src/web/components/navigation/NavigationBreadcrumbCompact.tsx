import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { ArrowBack, Home, ChevronRight } from '@mui/icons-material';
import { useNavigationStack } from '../../contexts/navigation/NavigationStackContext';

interface NavigationBreadcrumbCompactProps {
  onNavigateBack: () => void;
  onNavigateToLevel: (levelIndex: number) => void;
  onNavigateToRoot: () => void;
}

export const NavigationBreadcrumbCompact: React.FC<NavigationBreadcrumbCompactProps> = ({
  onNavigateBack,
  onNavigateToLevel,
  onNavigateToRoot,
}) => {
  const { stack, isNested, currentLevel } = useNavigationStack();

  if (!isNested || !currentLevel) return null;

  // Get the root tree name from the navigation context (first level)
  const rootTreeName = stack.length > 0 && stack[0] ? 'root' : 'root';

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
        fontSize: '0.9rem', // Increased from 0.8rem (+0.1)
        maxWidth: 'fit-content',
      }}
    >
      {/* Back Button */}
      <ArrowBack
        sx={{
          fontSize: '16px', // Increased from 14px
          color: '#666',
          cursor: 'pointer',
          '&:hover': { color: '#2196f3' },
        }}
        onClick={onNavigateBack}
      />
      {/* Home Icon - Clickable */}
      <Home
        sx={{
          fontSize: '16px',
          color: '#666',
          mx: 0.5,
          cursor: 'pointer',
          '&:hover': { color: '#2196f3' },
        }}
        onClick={onNavigateToRoot}
        title="Go to root navigation"
      />
      {/* Root Label - Clickable */}
      <Typography
        variant="caption"
        sx={{
          color: '#666',
          fontSize: '0.85rem', // Increased from 0.75rem (+0.1)
          fontWeight: 500,
          cursor: 'pointer',
          '&:hover': { color: '#2196f3' },
        }}
        onClick={onNavigateToRoot}
        title="Go to root navigation"
      >
        {rootTreeName}
      </Typography>
      {/* Show full chain if stack has multiple levels */}
      {stack.length > 1 &&
        stack.slice(0, -1).map((level, index) => (
          <React.Fragment key={index}>
            {/* Separator */}
            <ChevronRight sx={{ fontSize: '14px', color: '#999' }} /> {/* Increased from 12px */}
            {/* Intermediate Level - Clickable */}
            <Typography
              variant="caption"
              sx={{
                color: '#666',
                fontSize: '0.85rem', // Increased from 0.75rem (+0.1)
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { color: '#2196f3' },
              }}
              onClick={() => onNavigateToLevel(index)}
              title={`Go to ${level.parentNodeLabel}`}
            >
              {level.parentNodeLabel}
            </Typography>
          </React.Fragment>
        ))}
      {/* Final Separator */}
      <ChevronRight sx={{ fontSize: '14px', color: '#999' }} /> {/* Increased from 12px */}
      {/* Current Level */}
      <Chip
        label={currentLevel.parentNodeLabel}
        size="small"
        sx={{
          height: '22px', // Increased from 20px
          fontSize: '0.8rem', // Increased from 0.7rem (+0.1)
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
