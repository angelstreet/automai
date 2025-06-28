import React from 'react';

import { DeviceDataProvider } from '../device/DeviceDataContext';

import { NavigationProvider } from './NavigationContext';

interface NavigationEditorProviderProps {
  children: React.ReactNode;
}

// ========================================
// PROVIDER
// ========================================

export const NavigationEditorProvider: React.FC<NavigationEditorProviderProps> = ({ children }) => {
  return (
    <DeviceDataProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </DeviceDataProvider>
  );
};

NavigationEditorProvider.displayName = 'NavigationEditorProvider';
