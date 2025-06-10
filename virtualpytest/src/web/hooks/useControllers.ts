import { useState, useEffect } from 'react';
import { useRegistration } from '../contexts/RegistrationContext';

export interface ControllerType {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'placeholder';
}

export interface ControllerTypes {
  remote: ControllerType[];
  av: ControllerType[];
  network: ControllerType[];
  verification: ControllerType[];
  power: ControllerType[];
}

export function useControllers() {
  const { buildApiUrl } = useRegistration();
  const [controllerTypes, setControllerTypes] = useState<ControllerTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControllerTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('/server/controller/controller-types'));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setControllerTypes(data.controller_types);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch controller types:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
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