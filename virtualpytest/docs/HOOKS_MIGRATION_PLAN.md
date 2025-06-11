# Hooks Migration Plan - Revised

## Overview

After analyzing the existing codebase, I found that most hooks already exist but are organized differently or missing the `remote` directory structure. The main issue is that components are importing from `../hooks/remote/` which doesn't exist, but the functionality is available through other means.

## Issues Identified

### 1. Missing Remote Hooks Directory Structure
- **Problem**: Components import from `../hooks/remote/` which doesn't exist
- **Solution**: Create the remote directory and implement the missing hooks
- **Affected Files**: 
  - `components/remote/RemoteCore.tsx`
  - `components/remote/CompactAndroidMobile.tsx`
  - `components/modals/remote/AndroidMobileModal.tsx`
  - `pages/NavigationEditor.tsx`
  - `pages/Controller.tsx`

### 2. Existing Functionality Analysis
- ✅ `useRegistration` hook exists and provides controller proxies
- ✅ `useControllerConfig` hook exists for controller configurations
- ✅ Controller proxy classes exist (`RemoteControllerProxy`, `AVControllerProxy`, etc.)
- ❌ `useRemoteConnection` hook missing (but functionality exists in `useRegistration`)
- ❌ `useControllerTypes` hook missing (but data available in `useControllerConfig`)
- ❌ `useRemoteConfigs` hook missing (but configs exist in `useControllerConfig`)

### 3. Missing Component Files
- `components/user-interface/StreamViewer.tsx`
- `components/config/layoutConfig.ts`
- `components/CreateDeviceDialog.tsx`
- `components/EditDeviceDialog.tsx`
- `components/model/CreateModelDialog.tsx`
- `components/navigation/*` (multiple files)

## Revised Migration Strategy

### Phase 1: Create Remote Hooks Directory and Wrapper Hooks

Instead of reimplementing functionality, create wrapper hooks that use existing functionality:

#### 1.1 Create `hooks/remote/useRemoteConnection.ts`
```typescript
import { useState, useCallback, useEffect } from 'react';
import { useRegistration } from '../../contexts/RegistrationContext';

export interface RemoteConnectionState {
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  sendCommand: (command: string, params?: any) => Promise<void>;
  hideRemote: () => Promise<void>;
}

export function useRemoteConnection(remoteType: string): RemoteConnectionState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const { selectedHost } = useRegistration();

  // Check if remote controller is available
  useEffect(() => {
    if (selectedHost?.controllerProxies?.remote) {
      setIsConnected(true);
      setError(null);
    } else {
      setIsConnected(false);
    }
  }, [selectedHost]);

  const sendCommand = useCallback(async (command: string, params?: any) => {
    if (!selectedHost?.controllerProxies?.remote) {
      throw new Error('Remote controller proxy not available');
    }
    
    setIsLoading(true);
    try {
      // Use the existing controller proxy methods
      if (command === 'tap' && params?.x !== undefined && params?.y !== undefined) {
        await selectedHost.controllerProxies.remote.tapCoordinates(params.x, params.y);
      } else if (command === 'click' && params?.elementId) {
        await selectedHost.controllerProxies.remote.clickElement(params.elementId);
      } else {
        // Generic command sending
        console.log(`[@hook:useRemoteConnection] Sending command: ${command}`, params);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedHost]);

  const hideRemote = useCallback(async () => {
    setIsConnected(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    isConnected,
    sendCommand,
    hideRemote
  };
}
```

#### 1.2 Create `hooks/remote/useControllerTypes.ts`
```typescript
import { useState, useEffect } from 'react';
import { useControllerConfig } from '../features/useControllerConfig';

export interface ControllerTypesState {
  controllerTypes: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useControllerTypes(): ControllerTypesState {
  const [controllerTypes, setControllerTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAllConfigurations } = useControllerConfig();

  const fetchControllerTypes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const configurations = getAllConfigurations();
      const types = Object.keys(configurations);
      setControllerTypes(types);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControllerTypes();
  }, []);

  return {
    controllerTypes,
    loading,
    error,
    refetch: fetchControllerTypes
  };
}
```

#### 1.3 Create `hooks/remote/useRemoteConfigs.ts`
```typescript
import { useControllerConfig } from '../features/useControllerConfig';

export interface RemoteConfig {
  type: string;
  name: string;
  remote_info: {
    name: string;
    image_url: string;
    button_scale_factor: number;
    global_offset: { x: number; y: number };
    text_style: any;
  };
  button_layout: any;
}

export function getRemoteConfig(remoteType: string): RemoteConfig {
  const { getConfigurationByImplementation } = useControllerConfig();
  
  const config = getConfigurationByImplementation('remote', remoteType);
  
  if (!config) {
    // Return default config
    return {
      type: remoteType,
      name: remoteType,
      remote_info: {
        name: `${remoteType} Remote`,
        image_url: `/images/${remoteType}-remote.png`,
        button_scale_factor: 1.0,
        global_offset: { x: 0, y: 0 },
        text_style: {}
      },
      button_layout: {}
    };
  }

  return {
    type: remoteType,
    name: config.name,
    remote_info: {
      name: config.name,
      image_url: `/images/${remoteType}-remote.png`,
      button_scale_factor: 1.0,
      global_offset: { x: 0, y: 0 },
      text_style: {}
    },
    button_layout: {}
  };
}

// Export constants for backward compatibility
export const ANDROID_TV_CONFIG = getRemoteConfig('android_tv');
export const ANDROID_MOBILE_CONFIG = getRemoteConfig('android_mobile');
export const IR_CONFIG = getRemoteConfig('ir_remote');
export const BLUETOOTH_CONFIG = getRemoteConfig('bluetooth_remote');

export const REMOTE_CONFIGS = {
  'android-tv': ANDROID_TV_CONFIG,
  'android-mobile': ANDROID_MOBILE_CONFIG,
  'ir': IR_CONFIG,
  'bluetooth': BLUETOOTH_CONFIG
};
```

### Phase 2: Create Missing Component Stubs

#### 2.1 Create `components/user-interface/StreamViewer.tsx`
```typescript
import React from 'react';
import { Box, Typography } from '@mui/material';

interface StreamViewerProps {
  streamUrl?: string;
  onTap?: (x: number, y: number) => void;
}

export function StreamViewer({ streamUrl, onTap }: StreamViewerProps) {
  return (
    <Box sx={{ p: 2, textAlign: 'center', border: '1px dashed #ccc' }}>
      <Typography variant="h6" color="textSecondary">
        Stream Viewer Component
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Implementation needed for stream URL: {streamUrl || 'Not provided'}
      </Typography>
    </Box>
  );
}
```

#### 2.2 Create `components/config/layoutConfig.ts`
```typescript
export interface RemoteLayout {
  containerWidth: number;
  containerHeight: number;
}

export function getRemoteLayout(remoteType: string): RemoteLayout {
  const layouts: Record<string, RemoteLayout> = {
    'android-tv': { containerWidth: 300, containerHeight: 600 },
    'android-mobile': { containerWidth: 250, containerHeight: 500 },
    'ir': { containerWidth: 200, containerHeight: 400 },
    'bluetooth': { containerWidth: 200, containerHeight: 400 },
  };

  return layouts[remoteType] || { containerWidth: 300, containerHeight: 600 };
}
```

### Phase 3: Fix Controller Proxy Issues

#### 3.1 Add Missing Methods to `RemoteControllerProxy`
```typescript
// In controllers/RemoteControllerProxy.ts
export class RemoteControllerProxy extends BaseControllerProxy {
  private hostDevice: any;
  
  constructor(hostDevice: any, buildHostUrl: (hostId: string, endpoint: string) => string) {
    super();
    this.hostDevice = hostDevice;
    this.buildHostUrl = buildHostUrl;
  }
  
  // Add missing methods that are being called
  async getUIElements(): Promise<ControllerResponse<any[]>> {
    try {
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/ui-elements');
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, data: data.elements || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getUIElement(id: string): Promise<ControllerResponse<any>> {
    try {
      const url = this.buildHostUrl(this.hostDevice.id, `/host/remote/ui-element/${id}`);
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createUIElement(payload: any): Promise<ControllerResponse<any>> {
    try {
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/ui-element');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateUIElement(id: string, payload: any): Promise<ControllerResponse<any>> {
    try {
      const url = this.buildHostUrl(this.hostDevice.id, `/host/remote/ui-element/${id}`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteUIElement(id: string): Promise<ControllerResponse<void>> {
    try {
      const url = this.buildHostUrl(this.hostDevice.id, `/host/remote/ui-element/${id}`);
      const response = await fetch(url, { method: 'DELETE' });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
```

### Phase 4: Create Missing Hook File

#### 4.1 Create `hooks/useControllers.ts`
```typescript
import { useState, useEffect } from 'react';
import { useRegistration } from '../contexts/RegistrationContext';

export interface ControllersState {
  controllers: any[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export default function useControllers(): ControllersState {
  const [controllers, setControllers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { selectedHost } = useRegistration();

  const fetchControllers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (selectedHost?.controllerProxies) {
        const availableControllers = Object.keys(selectedHost.controllerProxies);
        setControllers(availableControllers.map(type => ({ type, available: true })));
      } else {
        setControllers([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControllers();
  }, [selectedHost]);

  return {
    controllers,
    loading,
    error,
    refetch: fetchControllers
  };
}
```

### Phase 5: Update Hook Exports

#### 5.1 Create `hooks/remote/index.ts`
```typescript
export { useRemoteConnection } from './useRemoteConnection';
export { useControllerTypes } from './useControllerTypes';
export { 
  getRemoteConfig, 
  REMOTE_CONFIGS, 
  ANDROID_TV_CONFIG, 
  ANDROID_MOBILE_CONFIG,
  IR_CONFIG,
  BLUETOOTH_CONFIG 
} from './useRemoteConfigs';
```

#### 5.2 Update `hooks/index.ts`
```typescript
// Export all web hooks from organized structure

// Common Hooks (shared across domains)
export * from './common/useCapture';
export * from './common/useValidationColors';

// Page Hooks (domain-specific for pages)
export * from './pages/useScreenEditor';
export * from './pages/useNavigationEditor';  
export * from './pages/useNavigationHooks';
export * from './pages/useDeviceModels';
export * from './pages/useUserInterface';

// Feature Hooks (domain-specific features)
export * from './features/useControllerConfig';
export * from './features/useValidation';
export * from './features/useValidationUI';

// Remote Hooks
export * from './remote';

// Main controller hook
export { default as useControllers } from './useControllers';
```

### Phase 6: Fix Type Issues

#### 6.1 Add Missing Properties to Types
Update `types/remote/types.ts` to include missing properties:
```typescript
export interface RemoteConfig {
  type: string;
  name: string;
  remote_info: {
    name: string;
    image_url: string;
    button_scale_factor: number;
    global_offset: { x: number; y: number };
    text_style: any;
  };
  button_layout: any;
}
```

### Phase 7: Clean Up Unused Imports

Remove unused imports identified in the build errors systematically.

## Implementation Priority

1. **High Priority** (Blocking build):
   - Create `hooks/remote/` directory and wrapper hooks
   - Create missing component stubs
   - Add missing methods to controller proxies

2. **Medium Priority** (Type safety):
   - Fix type issues in controller proxies
   - Add missing type properties
   - Update hook exports

3. **Low Priority** (Code quality):
   - Clean up unused imports
   - Remove unused variables
   - Implement proper component functionality

## Implementation Steps

1. Create the remote hooks directory: `mkdir -p hooks/remote`
2. Implement the three wrapper hooks using existing functionality
3. Create stub components for missing UI components
4. Add missing methods to `RemoteControllerProxy`
5. Create the main `useControllers` hook
6. Update all hook export files
7. Fix remaining type issues
8. Clean up unused imports
9. Test build and basic functionality

This revised plan leverages existing functionality and creates minimal wrapper hooks rather than reimplementing everything from scratch. 