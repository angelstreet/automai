import React from 'react';
import {
  Snackbar,
  Alert,
} from '@mui/material';

interface StatusMessagesProps {
  error: string | null;
  success: string | null;
}

export const StatusMessages: React.FC<StatusMessagesProps> = ({
  error,
  success,
}) => {
  return (
    <>
      {/* Success Messages */}
      {success && (
        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => {}}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      )}
      
      {/* Error Messages */}
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => {}}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}; 