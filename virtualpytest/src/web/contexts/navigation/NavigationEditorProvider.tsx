import React from 'react';

import { NavigationNodesProvider } from './NavigationNodesContext';
import { NavigationUIProvider } from './NavigationUIContext';
import { NavigationFlowProvider } from './NavigationFlowContext';
import { NavigationActionsProvider } from './NavigationActionsContext';

// ========================================
// TYPES
// ========================================

interface NavigationEditorProviderProps {
  children: React.ReactNode;
}

// ========================================
// PROVIDER
// ========================================

export const NavigationEditorProvider: React.FC<NavigationEditorProviderProps> = ({ children }) => {
  console.log('[@context:NavigationEditorProvider] Initializing navigation editor provider');

  return (
    <NavigationFlowProvider>
      <NavigationNodesProvider>
        <NavigationUIProvider>
          <NavigationActionsProvider>{children}</NavigationActionsProvider>
        </NavigationUIProvider>
      </NavigationNodesProvider>
    </NavigationFlowProvider>
  );
};

NavigationEditorProvider.displayName = 'NavigationEditorProvider';
