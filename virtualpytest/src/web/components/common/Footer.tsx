import { Box, Typography, Paper } from '@mui/material';
import React from 'react';

const Footer: React.FC = () => {
  return (
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
      <Box display="flex" justifyContent="space-between" alignItems="center" minHeight={24}>
        <Typography variant="body2" color="text.secondary">
          © 2024 VirtualPyTest - Automated Testing Platform
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            v1.0.0
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default Footer;
