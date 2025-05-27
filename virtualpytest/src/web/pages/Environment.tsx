import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import React from 'react';

const Environment: React.FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Environment Settings
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Configure test environment settings, API endpoints, and system preferences.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Environment configuration feature is coming soon. This will allow you to manage test
        environment settings.
      </Alert>

      <Grid container spacing={3}>
        {/* API Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">API Configuration</Typography>
              </Box>

              <Box component="form" sx={{ '& .MuiTextField-root': { mb: 2 } }}>
                <TextField
                  fullWidth
                  label="API Base URL"
                  defaultValue="http://localhost:5009/api"
                  disabled
                />
                <TextField
                  fullWidth
                  label="Timeout (seconds)"
                  type="number"
                  defaultValue="30"
                  disabled
                />
                <TextField
                  fullWidth
                  label="Retry Attempts"
                  type="number"
                  defaultValue="3"
                  disabled
                />

                <Box display="flex" gap={2} mt={2}>
                  <Button variant="contained" startIcon={<SaveIcon />} disabled>
                    Save
                  </Button>
                  <Button variant="outlined" startIcon={<RefreshIcon />} disabled>
                    Test Connection
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Test Environment */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SecurityIcon color="secondary" />
                <Typography variant="h6">Test Environment</Typography>
              </Box>

              <Box>
                <FormControlLabel control={<Switch disabled />} label="Enable Debug Mode" />
                <FormControlLabel control={<Switch disabled />} label="Capture Screenshots" />
                <FormControlLabel control={<Switch disabled />} label="Record Video" />
                <FormControlLabel control={<Switch disabled />} label="Verbose Logging" />

                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  label="Test Data Directory"
                  defaultValue="/data/test-files"
                  disabled
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Screenshot Directory"
                  defaultValue="/data/screenshots"
                  disabled
                  sx={{ mb: 2 }}
                />

                <Button variant="contained" startIcon={<SaveIcon />} disabled fullWidth>
                  Save Environment Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Application Version
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      v1.0.0
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Python Version
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      3.9.0
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Database Status
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="success.main">
                      Connected
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      Just now
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Environment;
