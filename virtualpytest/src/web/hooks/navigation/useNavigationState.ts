import { useContext } from 'react';
import { NavigationStateContext } from '../../contexts/navigation/NavigationStateContext';
import type { NavigationStateContextType } from '../../contexts/navigation/NavigationStateContext';

export const useNavigationState = (): NavigationStateContextType => {
  const context = useContext(NavigationStateContext);
  if (!context) {
    throw new Error('useNavigationState must be used within a NavigationStateProvider');
  }
  return context;
};
