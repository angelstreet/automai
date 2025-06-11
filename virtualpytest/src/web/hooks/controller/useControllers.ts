import { useState, useEffect } from 'react';
import { useRegistration } from "../../contexts/RegistrationContext";
import { ControllerTypesResponse } from '../../types/controller/Remote_Types';

export function useControllers() {
  const { buildApiUrl } = useRegistration();
  const [controllerTypes, setControllerTypes] = useState<ControllerTypesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControllerTypes = async () => {
    try {
      setLoading(true);
      console.log('[@hook:useControllers] 🔍 Fetching controller types from backend...');
      
      // Use RegistrationContext to build URL
      const response = await fetch(buildApiUrl('/server/controller/controller-types'));
      console.log('[@hook:useControllers] 📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[@hook:useControllers] ✅ Successfully fetched controller types:', data);
      
      setControllerTypes(data);
      setError(null);
    } catch (err: any) {
      console.error('[@hook:useControllers] ❌ Error fetching controller types:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControllerTypes();
  }, [buildApiUrl]);

  return {
    controllerTypes,
    loading,
    error,
    refetch: fetchControllerTypes
  };
} 