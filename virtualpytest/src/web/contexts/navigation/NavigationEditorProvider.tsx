import React from 'react';

import { DeviceDataProvider } from '../device/DeviceDataContext';
import { NavigationActionsProvider } from './NavigationActionsContext';
import { NavigationFlowProvider } from './NavigationFlowContext';
import { NavigationNodesProvider } from './NavigationNodesContext';
import { NavigationStateProvider } from './NavigationStateContext';
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
      <NavigationStateProvider>
        <NavigationNodesProvider>
          <NavigationUIProvider>
            <NavigationFlowProvider>
              <NavigationActionsProvider>{children}</NavigationActionsProvider>
            </NavigationFlowProvider>
          </NavigationUIProvider>
        </NavigationNodesProvider>
      </NavigationStateProvider>
    </DeviceDataProvider>
  );
};

NavigationEditorProvider.displayName = 'NavigationEditorProvider';
