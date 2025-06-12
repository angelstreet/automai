import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRegistration } from '../../contexts/RegistrationContext';

export interface NavigationHookResult {
  // Interface data
  interfaceName: string | undefined;
  interfaceModels: string[];
  isLoadingInterface: boolean;
  interfaceError: string | null;

  // Host data
  availableHosts: any[];
  filteredHosts: any[];
  isLoadingHosts: boolean;

  // Device selection
  selectedDeviceName: string | null;
  setSelectedDeviceName: (deviceName: string | null) => void;
}

export const useNavigation = (): NavigationHookResult => {
  // Extract interface name from URL
  const { interfaceName } = useParams<{ interfaceName: string }>();

  // Get hosts from registration context
  const { availableHosts, fetchHosts } = useRegistration();

  // Interface state
  const [interfaceModels, setInterfaceModels] = useState<string[]>([]);
  const [isLoadingInterface, setIsLoadingInterface] = useState(false);
  const [interfaceError, setInterfaceError] = useState<string | null>(null);

  // Device selection state
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);

  // Fetch interface models when interface name is available
  useEffect(() => {
    if (interfaceName) {
      setIsLoadingInterface(true);
      setInterfaceError(null);

      console.log(`[@hook:useNavigation] Fetching interface models for: ${interfaceName}`);

      fetch(`/server/userinterface/getUserInterfaceByName/${interfaceName}`)
        .then((response) => response.json())
        .then((data) => {
          if (data && data.models) {
            setInterfaceModels(data.models);
            console.log(
              `[@hook:useNavigation] Loaded models for interface ${interfaceName}:`,
              data.models,
            );
          } else {
            console.warn(`[@hook:useNavigation] No models found for interface: ${interfaceName}`);
            setInterfaceModels([]);
          }
        })
        .catch((error) => {
          console.error(`[@hook:useNavigation] Error fetching interface models:`, error);
          setInterfaceError(error.message);
          setInterfaceModels([]);
        })
        .finally(() => {
          setIsLoadingInterface(false);
        });
    }
  }, [interfaceName]);

  // Fetch hosts on mount
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Filter hosts based on interface models
  const filteredHosts = useMemo(() => {
    if (interfaceModels.length === 0) {
      console.log(
        `[@hook:useNavigation] No models loaded, showing all ${availableHosts.length} hosts`,
      );
      return availableHosts;
    }

    const filtered = availableHosts.filter((host) => interfaceModels.includes(host.device_model));

    console.log(
      `[@hook:useNavigation] Filtered hosts: ${filtered.length}/${availableHosts.length} hosts match models: ${interfaceModels.join(', ')}`,
    );

    return filtered;
  }, [availableHosts, interfaceModels]);

  return {
    // Interface data
    interfaceName,
    interfaceModels,
    isLoadingInterface,
    interfaceError,

    // Host data
    availableHosts,
    filteredHosts,
    isLoadingHosts: false, // Registration context handles this

    // Device selection
    selectedDeviceName,
    setSelectedDeviceName,
  };
};
