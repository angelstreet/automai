import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle as ConnectedIcon,
  Error as DisconnectedIcon,
  Gamepad as ControllerIcon,
  Tv as TvIcon,
  Wifi as WifiIcon,
  Visibility as VerificationIcon,
  Power as PowerIcon,
  Memory as ProcessorIcon,
} from '@mui/icons-material';

import { ControllerTypes, ControllerType } from '../../types/remote/types';
import { RemoteModal } from '../modals/remote/RemoteModal';
import { AndroidMobileModal } from '../modals/remote/AndroidMobileModal';
import { HDMIStreamModal } from '../modals/remote/HDMIStreamModal';

interface ControllerImplementationsProps {
  controllerTypes: ControllerTypes | null;
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

  const handleControllerClick = (category: string, controller: ControllerType) => {
    if (category === 'remote' && controller.id === 'android_tv') {
      setAndroidTVModalOpen(true);
    } else if (category === 'remote' && controller.id === 'real_android_mobile') {
      setAndroidMobileModalOpen(true);
    } else if (category === 'remote' && controller.id === 'ir_remote') {
      setIrRemoteModalOpen(true);
    } else if (category === 'remote' && controller.id === 'bluetooth_remote') {
      setBluetoothModalOpen(true);
    } else if (category === 'av' && controller.id === 'hdmi_stream') {
      setHdmiStreamModalOpen(true);
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
                  {implementations.map((impl: ControllerType, index: number) => (
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
    </>
  );
}; 