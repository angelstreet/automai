import React from 'react';

import { HostManagerProvider } from '../HostManagerProvider';
import { NavigationNodesProvider } from './NavigationNodesContext';
import { NavigationUIProvider } from './NavigationUIContext';
import { NavigationFlowProvider } from './NavigationFlowContext';
import { NavigationActionsProvider } from './NavigationActionsContext';

// ========================================
// TYPES
// ========================================

interface NavigationEditorProviderProps {
  children: React.ReactNode;
  // Optional interface filtering for device selection
  userInterface?: {
    models?: string[];
  };
}

// ========================================
// PROVIDER
// ========================================

export const NavigationEditorProvider: React.FC<NavigationEditorProviderProps> = ({
  children,
  userInterface,
}) => {
  return (
    <HostManagerProvider userInterface={userInterface}>
      <NavigationFlowProvider>
        <NavigationNodesProvider>
          <NavigationUIProvider>
            <NavigationActionsProvider>{children}</NavigationActionsProvider>
          </NavigationUIProvider>
        </NavigationNodesProvider>
      </NavigationFlowProvider>
    </HostManagerProvider>
  );
};

NavigationEditorProvider.displayName = 'NavigationEditorProvider';
