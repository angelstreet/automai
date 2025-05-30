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

The NavigationEditor now includes the AndroidMobileRemotePanel in its remote control panel:

```tsx
// NavigationEditor.tsx - Remote panel is now integrated
import { AndroidMobileRemotePanel } from '../components/remote/AndroidMobileRemotePanel';

// In the remote panel section
<AndroidMobileRemotePanel
  connectionConfig={undefined} // TODO: Get from user interface device config
  autoConnect={false}
  compact={true} // Smaller interface for NavigationEditor
  showScreenshot={false} // Hide screenshot to save space in navigation editor
  sx={{ 
    flex: 1,
    height: '100%',
    '& .MuiTypography-h6': {
      fontSize: '1rem' // Smaller headings in compact mode
    }
  }}
/>
```

**Features in NavigationEditor:**
- ✅ Toggle remote panel via header button
- ✅ Compact mode for sidebar panel
- ✅ No screenshot display (space optimized)
- ✅ Full device control capabilities
- ✅ Separate close button in panel header

### 2. AndroidMobileModal Refactoring ✅ COMPLETED

The AndroidMobileModal has been refactored to use AndroidMobileRemotePanel instead of duplicating code:

**Before:** 579 lines with duplicated remote control logic
**After:** ~150 lines using the modular AndroidMobileRemotePanel

**New Architecture:**
- Left column: Connection setup form (SSH + ADB parameters)
- Right column: AndroidMobileRemotePanel with full screenshot and controls
- Eliminates ~400 lines of duplicated code
- Maintains same functionality with better modularity

### 3. To add new controller types:

1. **Create new remote panel component** (e.g., `IRRemotePanel.tsx`)
2. **Add device type to EditControllerParametersDialog**
3. **Update RemoteController.tsx** to handle the new type
4. **Update getDeviceType function** in RemoteController.tsx

### 4. To extend with AudioVideo controls:

Similar pattern can be applied:
- `EditAudioVideoParametersDialog.tsx` for audio/video configuration
- `AudioVideoControlPanel.tsx` for audio/video remote control
- Update UserInterface.tsx to show audio/video controller name and edit/control buttons

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