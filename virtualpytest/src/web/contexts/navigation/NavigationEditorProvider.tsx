import React from 'react';

import { NavigationNodesProvider } from './NavigationNodesContext';
import { NavigationUIProvider } from './NavigationUIContext';
import { NavigationFlowProvider } from './NavigationFlowContext';
import { NavigationActionsProvider } from './NavigationActionsContext';
import { NavigationEditorProviderProps } from '../../types/pages/NavigationContext_Types';

// ========================================
// PROVIDER
// ========================================

export const NavigationEditorProvider: React.FC<NavigationEditorProviderProps> = ({ children }) => {
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
