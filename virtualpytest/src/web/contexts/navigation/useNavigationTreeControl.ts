import { useContext } from 'react';
import { NavigationConfigContext } from './NavigationConfigContext';
import { NavigationConfigContextType } from '../../types/pages/NavigationConfig_Types';

export const useNavigationTreeControl = (): NavigationConfigContextType => {
  const context = useContext(NavigationConfigContext);
  if (!context) {
    throw new Error('useNavigationTreeControl must be used within a NavigationConfigProvider');
  }
  return context;
};
