import { useState, useEffect } from 'react';

import { useRegistration } from '../../contexts/RegistrationContext';
import { ControllerTypesResponse } from '../../types/controller/Remote_Types';

export function useControllers() {
  const { buildServerUrl } = useRegistration();
  const [controllerTypes, setControllerTypes] = useState<ControllerTypesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControllerTypes = async () => {
    try {
      setLoading(true);
      console.log('[@hook:useControllers] Fetching controller types');

      const response = await fetch(buildServerUrl('/server/control/getAllControllers'));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract controller_types from API response
      setControllerTypes(data.controller_types || data);
      setError(null);
    } catch (err: any) {
      console.error('[@hook:useControllers] Error:', err);
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
    refetch: fetchControllerTypes,
  };
}
