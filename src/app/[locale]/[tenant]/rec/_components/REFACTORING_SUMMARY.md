# REC Component Refactoring Summary

## Overview

The REC (Remote Control) component system has been refactored to provide a more consistent, maintainable, and extensible architecture for handling different device types.

## Device Types Supported

### 1. Android TV (`androidTv`)

- **Streaming**: HLS video stream
- **Remote Control**: TV-specific remote with media controls (play, pause, rewind, fast forward)
- **Features**: Direction pad, volume controls, power, home, back, menu

### 2. Android Phone (`androidPhone`)

- **Streaming**: HLS video stream
- **Remote Control**: Phone-specific remote with phone features
- **Features**: Direction pad, volume controls, camera, phone, end call

### 3. Host (`host`)

- **Streaming**: VNC iframe connection
- **Remote Control**: None (direct VNC interaction)
- **Features**: Direct VNC viewer interaction

## New Component Structure

### Core Types (`types/recDeviceTypes.ts`)

```typescript
type DeviceType = 'androidTv' | 'androidPhone' | 'host';
type DeviceConfig = AndroidDeviceConfig | HostDeviceConfig;
```

### Unified Components

#### `RecDevicePreview`

- **Purpose**: Unified preview component for all device types
- **Features**: Shows appropriate preview (HLS stream preview or VNC iframe)
- **Usage**: Single component handles all device types

#### `RecDeviceModal`

- **Purpose**: Unified full-screen viewer for all device types
- **Features**:
  - HLS stream viewer for Android devices
  - VNC iframe viewer for hosts
  - Device-specific remote controls
  - Consistent UI/UX across device types

#### `RecPreviewGrid`

- **Purpose**: Layout component for displaying device previews
- **Features**: Responsive grid, loading states, error handling

### Device-Specific Remote Controls

#### `RecAndroidTvRemote`

- Direction pad + media controls (play, pause, rewind, fast forward)
- Volume controls + power button
- TV-specific layout and styling

#### `RecAndroidPhoneRemote`

- Direction pad + phone-specific controls (camera, phone, end call)
- Volume controls + power button
- Phone-specific layout and styling

### Event System (`RecEventListener`)

- **Simplified Events**: `OPEN_DEVICE_VIEWER`, `CLOSE_DEVICE_VIEWER`, `REFRESH_REC_DEVICES`
- **Unified Handling**: Single modal handles all device types
- **Type Safety**: Events carry `DeviceConfig` objects

## Migration from Old Components

### Removed Components (Obsolete)

- ❌ `RecStreamPreview.tsx` → Replaced by `RecDevicePreview.tsx`
- ❌ `RecUsbAdbStream.tsx` → Replaced by `RecDevicePreview.tsx`
- ❌ `RecStreamModal.tsx` → Replaced by `RecDeviceModal.tsx`
- ❌ `RecVncModal.tsx` → Replaced by `RecDeviceModal.tsx`
- ❌ `RecVncPreview.tsx` → Replaced by `RecDevicePreview.tsx`
- ❌ `RecVncPreviewGrid.tsx` → Replaced by `RecPreviewGrid.tsx`
- ❌ `RecStreamAdbRemote.tsx` → Replaced by `RecAndroidTvRemote.tsx`
- ❌ `RecStreamUsbAdbRemote.tsx` → Replaced by `RecAndroidPhoneRemote.tsx`

### Updated Components

- ✅ `RecEventListener.tsx` → Simplified event handling
- ✅ `RecContentClient.tsx` → Uses new unified grid

## Usage Examples

### Adding a New Android TV Device

```typescript
const androidTv: AndroidDeviceConfig = {
  id: 'tv-living-room',
  name: 'Living Room TV',
  type: 'androidTv',
  streamUrl: 'https://server.com/stream.m3u8',
  remoteConfig: {
    hostId: 'host-123',
    deviceId: '192.168.1.130:5555',
  },
};
```

### Adding a New Host Device

```typescript
const hostDevice: HostDeviceConfig = {
  id: 'host-server-1',
  name: 'Test Server',
  type: 'host',
  vncConfig: {
    ip: '192.168.1.50',
    port: 5900,
    password: 'optional-password',
  },
};
```

### Opening a Device Viewer

```typescript
window.dispatchEvent(
  new CustomEvent(RecEvents.OPEN_DEVICE_VIEWER, {
    detail: { device: androidTv },
  }),
);
```

## Benefits of Refactoring

### 1. **Consistency**

- Single interface for all device types
- Unified UI/UX patterns
- Consistent event handling

### 2. **Maintainability**

- Clear separation of concerns
- Type-safe device configurations
- Reduced code duplication

### 3. **Extensibility**

- Easy to add new device types
- Standardized device configuration format
- Pluggable remote control system

### 4. **Developer Experience**

- Clear naming conventions
- Self-documenting code structure
- TypeScript type safety

## Development Guidelines

### Adding New Device Types

1. Add device type to `DeviceType` union
2. Create device config interface extending `BaseDeviceConfig`
3. Update `DeviceConfig` union type
4. Add rendering logic to `RecDevicePreview` and `RecDeviceModal`
5. Create device-specific remote control component if needed

### Device Configuration

- Always use the proper TypeScript interfaces
- Include all required configuration for the device type
- Use descriptive device names and IDs

### Event Handling

- Use the unified event system via `RecEvents`
- Always include device configuration in event details
- Handle events in `RecEventListener` component

## File Organization

```
rec/
├── types/
│   └── recDeviceTypes.ts          # Type definitions
├── client/
│   ├── RecContentClient.tsx       # Main client component
│   ├── RecEventListener.tsx       # Event handling
│   ├── RecPreviewGrid.tsx         # Device grid layout
│   ├── RecDevicePreview.tsx       # Unified device preview
│   ├── RecDeviceModal.tsx         # Unified device modal
│   ├── RecAndroidTvRemote.tsx     # TV remote control
│   └── RecAndroidPhoneRemote.tsx  # Phone remote control
└── RecContent.tsx                 # Server wrapper
```
