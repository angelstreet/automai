import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Paper,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess, 
  PlayArrow, 
  Stop, 
  Settings, 
  Info,
  Close as CloseIcon,
  Gamepad as ControllerIcon,
  Tv as TvIcon,
  Wifi as WifiIcon,
  Visibility as VerificationIcon,
  Power as PowerIcon,
  Memory as ProcessorIcon,
  CheckCircle as ConnectedIcon,
  Cancel as DisconnectedIcon,
} from '@mui/icons-material';

// Temporary types until we fix the type imports
interface ControllerItem {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'placeholder';
}

interface ControllerTypesResponse {
  [key: string]: ControllerItem[];
}

// TODO: Fix these imports when modal components are available
// import { RemoteModal } from '../../modals/remote/RemoteModal';
// import { AndroidMobileModal } from '../../modals/remote/AndroidMobileModal';
// import { HDMIStreamModal } from '../../modals/remote/HDMIStreamModal';
// import { USBPowerPanel } from '../power/USBPowerPanel';

interface ControllerImplementationsProps {
  controllerTypes: ControllerTypesResponse | null;
}

export const ControllerImplementations: React.FC<ControllerImplementationsProps> = ({
  controllerTypes,
}) => {
  // Modal states
  const [androidTVModalOpen, setAndroidTVModalOpen] = useState(false);
  const [androidMobileModalOpen, setAndroidMobileModalOpen] = useState(false);
  const [irRemoteModalOpen, setIrRemoteModalOpen] = useState(false);
  const [bluetoothModalOpen, setBluetoothModalOpen] = useState(false);
  const [hdmiStreamModalOpen, setHdmiStreamModalOpen] = useState(false);
  const [usbPowerModalOpen, setUsbPowerModalOpen] = useState(false);

  const getControllerIcon = (type: string) => {
    switch (type) {
      case 'remote': return <ControllerIcon />;
      case 'av': return <TvIcon />;
      case 'network': return <WifiIcon />;
      case 'verification': return <VerificationIcon />;
      case 'power': return <PowerIcon />;
      default: return <ProcessorIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'placeholder': return 'default';
      default: return 'default';
    }
  };

  const handleControllerClick = (category: string, controller: ControllerItem) => {
    if (category === 'remote' && controller.id === 'android_tv') {
      setAndroidTVModalOpen(true);
    } else if (category === 'remote' && controller.id === 'android_mobile') {
      setAndroidMobileModalOpen(true);
    } else if (category === 'remote' && controller.id === 'ir_remote') {
      setIrRemoteModalOpen(true);
    } else if (category === 'remote' && controller.id === 'bluetooth_remote') {
      setBluetoothModalOpen(true);
    } else if (category === 'av' && controller.id === 'hdmi_stream') {
      setHdmiStreamModalOpen(true);
    } else if (category === 'power' && controller.id === 'usb') {
      setUsbPowerModalOpen(true);
    }
  };

  if (!controllerTypes) {
    return null;
  }

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Controller Implementations
          </Typography>

          {Object.entries(controllerTypes).map(([type, implementations]) => (
            <Accordion key={type}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2}>
                  {getControllerIcon(type)}
                  <Typography variant="h6">
                    {type.charAt(0).toUpperCase() + type.slice(1)} Controllers
                  </Typography>
                  <Chip 
                    label={`${implementations.length} types`} 
                    size="small" 
                    color="primary" 
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {implementations.map((impl: ControllerItem, index: number) => (
                    <React.Fragment key={impl.id}>
                      <ListItem
                        onClick={() => impl.status === 'available' && handleControllerClick(type, impl)}
                        sx={{ 
                          cursor: impl.status === 'available' ? 'pointer' : 'default',
                          '&:hover': impl.status === 'available' ? { backgroundColor: 'action.hover' } : {}
                        }}
                      >
                        <ListItemIcon>
                          {impl.status === 'available' ? (
                            <ConnectedIcon color="success" />
                          ) : (
                            <DisconnectedIcon color="disabled" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={impl.name}
                          secondary={impl.description}
                        />
                        <Chip 
                          label={impl.status} 
                          color={getStatusColor(impl.status) as any}
                          size="small" 
                        />
                      </ListItem>
                      {index < implementations.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      {/* Controller Modals */}
      {/* TODO: Uncomment when modal components are available
      <RemoteModal 
        remoteType="android-tv"
        open={androidTVModalOpen} 
        onClose={() => setAndroidTVModalOpen(false)} 
      />
      <AndroidMobileModal 
        open={androidMobileModalOpen} 
        onClose={() => setAndroidMobileModalOpen(false)} 
      />
      <RemoteModal 
        remoteType="ir"
        open={irRemoteModalOpen} 
        onClose={() => setIrRemoteModalOpen(false)} 
      />
      <RemoteModal 
        remoteType="bluetooth"
        open={bluetoothModalOpen} 
        onClose={() => setBluetoothModalOpen(false)} 
      />
      <HDMIStreamModal 
        open={hdmiStreamModalOpen} 
        onClose={() => setHdmiStreamModalOpen(false)}
      />
      */}
      
      {/* USB Power Control Modal */}
      <Dialog 
        open={usbPowerModalOpen} 
        onClose={() => setUsbPowerModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          USB Power Control
          <IconButton
            aria-label="close"
            onClick={() => setUsbPowerModalOpen(false)}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* TODO: Uncomment when USBPowerPanel is available */}
          {/* <USBPowerPanel /> */}
          <Typography>USB Power Panel - Coming Soon</Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}; 