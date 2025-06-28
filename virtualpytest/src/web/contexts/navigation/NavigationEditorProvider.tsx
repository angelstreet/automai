import React from 'react';

import { DeviceDataProvider } from '../device/DeviceDataContext';
import { NavigationActionsProvider } from './NavigationActionsContext';
import { NavigationFlowProvider } from './NavigationFlowContext';
import { NavigationNodesProvider } from './NavigationNodesContext';
import { NavigationUIProvider } from './NavigationUIContext';

interface NavigationEditorProviderProps {
  children: React.ReactNode;
}

// ========================================
// PROVIDER
// ========================================

export const NavigationEditorProvider: React.FC<NavigationEditorProviderProps> = ({ children }) => {
  return (
    <DeviceDataProvider>
      <NavigationNodesProvider>
        <NavigationUIProvider>
          <NavigationFlowProvider>
            <NavigationActionsProvider>{children}</NavigationActionsProvider>
          </NavigationFlowProvider>
        </NavigationUIProvider>
      </NavigationNodesProvider>
    </DeviceDataProvider>
  );
};

NavigationEditorProvider.displayName = 'NavigationEditorProvider';
