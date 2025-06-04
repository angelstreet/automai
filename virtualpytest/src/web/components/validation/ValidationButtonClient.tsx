'use client';

import { Button, CircularProgress } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useValidation } from '../hooks/useValidation';

interface ValidationButtonClientProps {
  treeId: string;
  disabled?: boolean;
}

export default function ValidationButtonClient({ treeId, disabled }: ValidationButtonClientProps) {
  const { isValidating, results, openPreview } = useValidation(treeId);

  const getButtonColor = () => {
    if (!results) return 'primary';
    
    switch (results.summary.overallHealth) {
      case 'excellent':
        return 'success';
      case 'poor':
        return 'error';
      case 'fair':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const handleClick = () => {
    console.log(`[@component:ValidationButtonClient] Validation button clicked for tree: ${treeId}`);
    openPreview();
  };

  return (
    <Button
      startIcon={isValidating ? <CircularProgress size={16} /> : <CheckCircleIcon />}
      onClick={handleClick}
      size="small"
      disabled={disabled || isValidating}
      variant="outlined"
      color={getButtonColor()}
      sx={{ 
        minWidth: 'auto',
        whiteSpace: 'nowrap',
        fontSize: '0.75rem'
      }}
    >
      Validate
    </Button>
  );
} 