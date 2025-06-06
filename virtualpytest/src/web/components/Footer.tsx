import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  BugReport as BugIcon,
} from '@mui/icons-material';
import DebugModal from './DebugModal';

const Footer: React.FC = () => {
  const [debugModalOpen, setDebugModalOpen] = useState(false);

  const handleDebugClick = () => {
    setDebugModalOpen(true);
  };

  const handleDebugClose = () => {
    setDebugModalOpen(false);
  };

  return (
    <>
      <Paper
        component="footer"
        elevation={1}
        sx={{
          mt: 'auto',
          py: 1,
          px: 2,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          minHeight={40}
        >
          <Typography variant="body2" color="text.secondary">
            © 2024 VirtualPyTest - Automated Testing Platform
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary">
              v1.0.0
            </Typography>
            
            <Tooltip title="Debug Logs" placement="top">
              <IconButton
                size="small"
                onClick={handleDebugClick}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                <BugIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <DebugModal
        open={debugModalOpen}
        onClose={handleDebugClose}
      />
    </>
  );
};

export default Footer; 