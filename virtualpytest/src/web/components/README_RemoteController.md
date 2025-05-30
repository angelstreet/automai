# Remote Controller Integration

This document explains the implementation of the Remote Controller integration in the UserInterface component.

## Overview

The Remote Controller system allows users to control devices directly from the User Interface management page. When a user interface is configured with specific device models, the system can detect compatible devices and provide remote control capabilities.

## Architecture

### Components

#### 1. **EditControllerParametersDialog** (`src/web/components/remote/EditControllerParametersDialog.tsx`)
   - **Purpose**: Dedicated dialog for editing controller connection parameters
   - **Features**:
     - Supports multiple controller types (Android Mobile, Android TV, IR Remote, Bluetooth Remote)
     - Dynamic form fields based on controller type
     - Input validation and error handling
     - Saves configuration back to device settings
   - **Usage**: Called from UserInterface.tsx Edit button

#### 2. **AndroidMobileRemotePanel** (`src/web/components/remote/AndroidMobileRemotePanel.tsx`)
   - **Purpose**: Pure remote control interface without connection setup
   - **Features**:
     - App launcher with device app discovery
     - Screenshot capture and UI element inspection
     - Interactive overlay for element clicking
     - Phone controls (back, home, volume, etc.)
     - Compact mode for smaller spaces
     - Optional screenshot display
     - Auto-connect capability with pre-configured parameters
   - **Usage**: Can be used in NavigationEditor remote panel or RemoteController modal

#### 3. **RemoteController** (`src/web/components/RemoteController.tsx`)
   - **Purpose**: Main wrapper component that routes to appropriate device controllers
   - **Features**:
     - Device type detection and controller selection
     - Provides consistent modal interface for all remote controller types
     - Extracts connection config from device settings
     - Handles different device types gracefully
   - **Usage**: Called from UserInterface.tsx Control button

#### 4. **UserInterface** (`src/web/pages/UserInterface.tsx`)
   - **Purpose**: Main interface management page
   - **Features**:
     - Displays controller name instead of generic "Remote Controller"
     - Separate Control and Edit buttons for each interface
     - Intelligent device compatibility checking
     - Error handling for unsupported devices

## Data Flow

### For UserInterface.tsx:

1. **Display Controller Name**:
   ```
   UserInterface → Find Compatible Device → Get Device Type → Display Controller Name
   ```

2. **Edit Controller Parameters**:
   ```
   Edit Button → Find Compatible Device → Open EditControllerParametersDialog → Save Config → Reload Devices
   ```

3. **Remote Control**:
   ```
   Control Button → Find Compatible Device → Open RemoteController → Load AndroidMobileRemotePanel
   ```

### For NavigationEditor.tsx:

1. **Remote Panel Integration** (Future):
   ```
   NavigationEditor → Load Device Config → AndroidMobileRemotePanel (compact=true, showScreenshot=false)
   ```

## Device Configuration Structure

The system expects device objects with the following structure:

```typescript
interface Device {
  id: string;
  name: string;
  model: string;
  controller_configs?: {
    remote?: {
      type: 'android_mobile' | 'android_tv' | 'ir_remote' | 'bluetooth_remote';
      // SSH + ADB configs (for Android devices)
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
    };
  };
}
```

## Implementation Guide

### 1. NavigationEditor Integration ✅ COMPLETED

The NavigationEditor now includes remote control panels for all supported device types:

```tsx
// NavigationEditor.tsx - Remote panel supports multiple device types
import { AndroidMobileRemotePanel } from '../components/remote/AndroidMobileRemotePanel';
import { AndroidTVRemotePanel } from '../components/remote/AndroidTVRemotePanel';
import { IRRemotePanel } from '../components/remote/IRRemotePanel';
import { BluetoothRemotePanel } from '../components/remote/BluetoothRemotePanel';

// Device type selection in NavigationEditor
const [selectedDeviceType, setSelectedDeviceType] = useState<'android_mobile' | 'android_tv' | 'ir_remote' | 'bluetooth_remote'>('android_mobile');

// Device type selection buttons
<Button variant={selectedDeviceType === 'android_mobile' ? 'contained' : 'outlined'}>Android Mobile</Button>
<Button variant={selectedDeviceType === 'android_tv' ? 'contained' : 'outlined'}>Android TV</Button>
<Button variant={selectedDeviceType === 'ir_remote' ? 'contained' : 'outlined'}>IR Remote</Button>
<Button variant={selectedDeviceType === 'bluetooth_remote' ? 'contained' : 'outlined'}>Bluetooth Remote</Button>

// Conditional rendering based on device type
{selectedDeviceType === 'android_mobile' ? (
  <AndroidMobileRemotePanel compact={true} showScreenshot={false} />
) : selectedDeviceType === 'android_tv' ? (
  <AndroidTVRemotePanel compact={true} showScreenshot={false} />
) : selectedDeviceType === 'ir_remote' ? (
  <IRRemotePanel compact={true} />
) : (
  <BluetoothRemotePanel compact={true} />
)}
```

### 2. Modal Refactoring ✅ COMPLETED

All controller modals have been refactored to use the new panel components:

#### AndroidMobileModal.tsx ✅ COMPLETED
- Now uses `AndroidMobileRemotePanel`
- Simplified connection form management
- Cleaner separation of concerns

#### AndroidTVModal.tsx ✅ COMPLETED  
- Now uses `AndroidTVRemotePanel`
- Simplified connection form management
- Consistent modal structure

#### IRRemoteModal.tsx ✅ COMPLETED
- Now uses `IRRemotePanel`
- Handles IR device configuration
- Consistent structure with other modals

#### 4. **BluetoothRemoteModal** ✅ COMPLETED
- Uses `BluetoothRemotePanel`
- Handles Bluetooth device pairing and configuration
- Consistent structure with other modals

### 3. RemoteController Integration ✅ COMPLETED

The main RemoteController component now supports all device types:

```tsx
// RemoteController.tsx - Supports all device types
case 'android_mobile':
  return <AndroidMobileRemotePanel connectionConfig={getAndroidConnectionConfig()} />;
case 'android_tv':
  return <AndroidTVRemotePanel connectionConfig={getAndroidConnectionConfig()} />;
case 'ir_remote':
  return <IRRemotePanel connectionConfig={getIRConnectionConfig()} />;
```

## Component Architecture

### Reusable Remote Panels

#### 1. **AndroidMobileRemotePanel** ✅ COMPLETED
- **Purpose**: Android Mobile device remote control
- **Features**: Screenshot, touch controls, compact mode
- **Props**: `connectionConfig`, `autoConnect`, `compact`, `showScreenshot`

#### 2. **AndroidTVRemotePanel** ✅ COMPLETED
- **Purpose**: Android TV device remote control  
- **Features**: Screenshot, TV remote buttons, compact mode
- **Props**: `connectionConfig`, `autoConnect`, `compact`, `showScreenshot`

#### 3. **IRRemotePanel** ✅ COMPLETED
- **Purpose**: IR remote control for TVs/set-top boxes
- **Features**: IR remote interface, compact mode
- **Props**: `connectionConfig`, `autoConnect`, `compact`

#### 4. **BluetoothRemotePanel** ✅ COMPLETED
- **Purpose**: Bluetooth remote control for HID devices
- **Features**: Bluetooth remote interface, compact mode
- **Props**: `connectionConfig`, `autoConnect`, `compact`

### Modal Components (Refactored)

#### 1. **AndroidMobileModal** ✅ COMPLETED
- Uses `AndroidMobileRemotePanel`
- Handles connection form and modal UI
- Clean separation between connection setup and remote control

#### 2. **AndroidTVModal** ✅ COMPLETED
- Uses `AndroidTVRemotePanel` 
- Handles connection form and modal UI
- Consistent structure with other modals

#### 3. **IRRemoteModal** ✅ COMPLETED
- Uses `IRRemotePanel`
- Handles IR device configuration
- Consistent structure with other modals

#### 4. **BluetoothRemoteModal** ✅ COMPLETED
- Uses `BluetoothRemotePanel`
- Handles Bluetooth device pairing and configuration
- Consistent structure with other modals

## Configuration Support

### EditControllerParametersDialog ✅ COMPLETED

The configuration dialog supports all device types:

```tsx
// Supported device types
type: 'android_mobile' | 'android_tv' | 'ir_remote' | 'bluetooth_remote'

// Android Mobile/TV Configuration
host_ip, host_port, host_username, host_password, device_ip, device_port

// IR Remote Configuration  
ir_device (device path), protocol, frequency

// Bluetooth Remote Configuration (planned)
device_address, pairing_pin, hid_profile
```

## Event-Based Communication

The components use React's built-in state management and props for communication. For cross-component communication in NavigationEditor, consider using the existing event-based pattern:

```typescript
// Example for remote panel events
const RemotePanelEvents = {
  DEVICE_CONNECTED: 'DEVICE_CONNECTED',
  DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
  SCREENSHOT_CAPTURED: 'SCREENSHOT_CAPTURED',
  ELEMENT_CLICKED: 'ELEMENT_CLICKED',
};

// Dispatch events from AndroidMobileRemotePanel
window.dispatchEvent(new CustomEvent(RemotePanelEvents.DEVICE_CONNECTED, {
  detail: { deviceId: device.id, deviceName: device.name }
}));
```

## Security Considerations

- **SSH credentials** are stored in device configuration
- **Connection parameters** should be encrypted at rest
- **Auto-connect** should be optional and user-controlled
- **Device access** should be validated before connection attempts

## Future Enhancements

1. **Multi-device support**: Allow users to select from multiple compatible devices
2. **Connection status indicators**: Real-time connection status in UI
3. **Device discovery**: Automatic discovery of devices on the network
4. **Session persistence**: Remember connection state across page refreshes
5. **Remote control shortcuts**: Keyboard shortcuts for common actions
6. **Screen recording**: Capture device interactions for test recording

## Testing Guidelines

1. **Test with different device types** to ensure proper controller routing
2. **Test connection parameter validation** in EditControllerParametersDialog
3. **Test compact mode** for NavigationEditor integration
4. **Test error handling** for unsupported devices and connection failures
5. **Test configuration persistence** after saving controller parameters 