import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigationStack } from '../../contexts/navigation/NavigationStackContext';

export const NavigationBreadcrumb: React.FC<{ onNavigateBack: () => void }> = ({
  onNavigateBack,
}) => {
  const { stack, isNested } = useNavigationStack();

  if (!isNested) return null;

  const currentLevel = stack[stack.length - 1];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: '#f5f5f5',
        borderBottom: '1px solid #ddd',
      }}
    >
      <Button size="small" startIcon={<ArrowBack />} onClick={onNavigateBack} variant="text">
        Back
      </Button>

      <Typography variant="body2" color="text.secondary">
        Main Navigation
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {' > '}
      </Typography>

      <Typography variant="body2" color="text.primary" fontWeight="medium">
        {currentLevel.parentNodeLabel}
      </Typography>
    </Box>
  );
};
