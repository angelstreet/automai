import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Gamepad as ControllerIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Bluetooth as BluetoothIcon,
  Usb as UsbIcon,
  Wifi as WifiIcon,
  CheckCircle as ConnectedIcon,
  Error as DisconnectedIcon,
} from '@mui/icons-material';

const Controller: React.FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Controller Configuration
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage remote controls, input devices, and controller configurations for testing.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Controller configuration feature is coming soon. This will allow you to manage remote controls and input devices for testing.
      </Alert>

      <Grid container spacing={3}>
        {/* Connected Controllers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ControllerIcon color="primary" />
                  <Typography variant="h6">Connected Controllers</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled
                >
                  Add Controller
                </Button>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <DisconnectedIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="No controllers connected"
                    secondary="Connect a remote control or input device to get started"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Controller Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Supported Controller Types
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <BluetoothIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Bluetooth Remote"
                    secondary="Wireless remote controls via Bluetooth"
                  />
                  <Chip label="Supported" color="success" size="small" />
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemIcon>
                    <UsbIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="USB Controller"
                    secondary="Wired controllers and input devices"
                  />
                  <Chip label="Supported" color="success" size="small" />
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemIcon>
                    <WifiIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Network Remote"
                    secondary="IP-based remote control protocols"
                  />
                  <Chip label="Coming Soon" color="default" size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Controller Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">Controller Settings</Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      border: 1, 
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Button Mapping
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                      Configure button assignments and key mappings
                    </Typography>
                    <Button size="small" disabled>Configure</Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      border: 1, 
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Response Timing
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                      Set input delays and response timeouts
                    </Typography>
                    <Button size="small" disabled>Configure</Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      border: 1, 
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Auto-Discovery
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                      Automatically detect and connect controllers
                    </Typography>
                    <Button size="small" disabled>Enable</Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      border: 1, 
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Test Mode
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                      Test controller inputs and responses
                    </Typography>
                    <Button size="small" disabled>Start Test</Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled
                >
                  Scan for Controllers
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  color="secondary"
                  disabled
                >
                  Import Configuration
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ControllerIcon />}
                  disabled
                >
                  Test All Controllers
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Controller; 