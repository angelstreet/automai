import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';

export interface ControllerConfig {
  type: 'android_mobile' | 'android_tv' | 'ir_remote' | 'bluetooth_remote';
  // SSH + ADB configs
  host_ip?: string;
  host_port?: string;
  host_username?: string;
  host_password?: string;
  device_ip?: string;
  device_port?: string;
  // IR Remote configs
  ir_device?: string;
  protocol?: string;
  frequency?: string;
  // Bluetooth configs
  device_address?: string;
  pairing_pin?: string;
  hid_profile?: string;
}

interface EditControllerParametersDialogProps {
  open: boolean;
  device: {
    id: string;
    name: string;
    model: string;
    controller_configs?: any;
  } | null;
  onClose: () => void;
  onSave: (deviceId: string, config: ControllerConfig) => Promise<void>;
}

export function EditControllerParametersDialog({ 
  open, 
  device, 
  onClose, 
  onSave 
}: EditControllerParametersDialogProps) {
  const [config, setConfig] = useState<ControllerConfig>({
    type: 'android_mobile'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing config when device changes
  useEffect(() => {
    if (device && device.controller_configs?.remote) {
      const remoteConfig = device.controller_configs.remote;
      setConfig({
        type: remoteConfig.type || 'android_mobile',
        // SSH + ADB
        host_ip: remoteConfig.host_ip || '',
        host_port: remoteConfig.host_port || '22',
        host_username: remoteConfig.host_username || '',
        host_password: remoteConfig.host_password || '',
        device_ip: remoteConfig.device_ip || '',
        device_port: remoteConfig.device_port || '5555',
        // IR Remote
        ir_device: remoteConfig.ir_device || '/dev/lirc0',
        protocol: remoteConfig.protocol || 'NEC',
        frequency: remoteConfig.frequency || '38000',
        // Bluetooth
        device_address: remoteConfig.device_address || '00:00:00:00:00:00',
        pairing_pin: remoteConfig.pairing_pin || '0000',
        hid_profile: remoteConfig.hid_profile || 'keyboard',
      });
    } else {
      // Reset to defaults
      setConfig({
        type: 'android_mobile',
        host_ip: '',
        host_port: '22',
        host_username: '',
        host_password: '',
        device_ip: '',
        device_port: '5555',
        ir_device: '/dev/lirc0',
        protocol: 'NEC',
        frequency: '38000',
        device_address: '00:00:00:00:00:00',
        pairing_pin: '0000',
        hid_profile: 'keyboard',
      });
    }
    setError(null);
  }, [device]);

  const handleSave = async () => {
    if (!device) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await onSave(device.id, config);
      console.log(`[@component:EditControllerParametersDialog] Saved controller config for device ${device.id}`);
      onClose();
    } catch (err) {
      console.error('[@component:EditControllerParametersDialog] Error saving config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save controller configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const updateConfig = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const renderControllerTypeFields = () => {
    switch (config.type) {
      case 'android_mobile':
      case 'android_tv':
        return (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              SSH Connection Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SSH Host IP"
                  value={config.host_ip || ''}
                  onChange={(e) => updateConfig('host_ip', e.target.value)}
                  size="small"
                  required
                  placeholder="e.g., 192.168.1.100"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SSH Port"
                  value={config.host_port || ''}
                  onChange={(e) => updateConfig('host_port', e.target.value)}
                  size="small"
                  placeholder="22"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SSH Username"
                  value={config.host_username || ''}
                  onChange={(e) => updateConfig('host_username', e.target.value)}
                  size="small"
                  required
                  placeholder="username"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SSH Password"
                  type="password"
                  value={config.host_password || ''}
                  onChange={(e) => updateConfig('host_password', e.target.value)}
                  size="small"
                  required
                  placeholder="password"
                />
              </Grid>
            </Grid>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Device Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Device IP"
                  value={config.device_ip || ''}
                  onChange={(e) => updateConfig('device_ip', e.target.value)}
                  size="small"
                  required
                  placeholder="e.g., 192.168.1.101"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="ADB Port"
                  value={config.device_port || ''}
                  onChange={(e) => updateConfig('device_port', e.target.value)}
                  size="small"
                  placeholder="5555"
                />
              </Grid>
            </Grid>
          </>
        );

      case 'ir_remote':
        return (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              IR Remote Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="IR Device Path"
                  value={config.ir_device || ''}
                  onChange={(e) => updateConfig('ir_device', e.target.value)}
                  size="small"
                  placeholder="/dev/lirc0"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Protocol</InputLabel>
                  <Select
                    value={config.protocol || 'NEC'}
                    onChange={(e) => updateConfig('protocol', e.target.value)}
                    label="Protocol"
                  >
                    <MenuItem value="NEC">NEC</MenuItem>
                    <MenuItem value="RC5">RC5</MenuItem>
                    <MenuItem value="RC6">RC6</MenuItem>
                    <MenuItem value="Sony">Sony</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Frequency (Hz)"
                  value={config.frequency || ''}
                  onChange={(e) => updateConfig('frequency', e.target.value)}
                  size="small"
                  placeholder="38000"
                />
              </Grid>
            </Grid>
          </>
        );

      case 'bluetooth_remote':
        return (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Bluetooth Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Device MAC Address"
                  value={config.device_address || ''}
                  onChange={(e) => updateConfig('device_address', e.target.value)}
                  size="small"
                  placeholder="00:00:00:00:00:00"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Pairing PIN"
                  value={config.pairing_pin || ''}
                  onChange={(e) => updateConfig('pairing_pin', e.target.value)}
                  size="small"
                  placeholder="0000"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>HID Profile</InputLabel>
                  <Select
                    value={config.hid_profile || 'keyboard'}
                    onChange={(e) => updateConfig('hid_profile', e.target.value)}
                    label="HID Profile"
                  >
                    <MenuItem value="keyboard">Keyboard</MenuItem>
                    <MenuItem value="mouse">Mouse</MenuItem>
                    <MenuItem value="gamepad">Gamepad</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">
          Edit Controller Parameters
          {device && (
            <Typography variant="subtitle2" color="textSecondary">
              Device: {device.name} ({device.model})
            </Typography>
          )}
        </Typography>
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ pt: 1 }}>
          {/* Controller Type Selection */}
          <Typography variant="h6" gutterBottom>
            Controller Type
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Controller Type</InputLabel>
            <Select
              value={config.type}
              onChange={(e) => updateConfig('type', e.target.value)}
              label="Controller Type"
            >
              <MenuItem value="android_mobile">Android Mobile</MenuItem>
              <MenuItem value="android_tv">Android TV</MenuItem>
              <MenuItem value="ir_remote">IR Remote</MenuItem>
              <MenuItem value="bluetooth_remote">Bluetooth Remote</MenuItem>
            </Select>
          </FormControl>

          {/* Controller-specific fields */}
          {renderControllerTypeFields()}
        </Box>
      </DialogContent>

      <DialogActions sx={{ pt: 1, pb: 2, px: 3, gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 