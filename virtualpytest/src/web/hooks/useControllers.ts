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
      console.log('[@hook:useControllers] 🔍 Fetching controller types from backend...');
      
      const response = await fetch(buildApiUrl('/server/controller/controller-types'));
      console.log('[@hook:useControllers] 📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[@hook:useControllers] ✅ Controller types received:', Object.keys(data.controller_types || {}));
      
      setControllerTypes(data.controller_types);
      setError(null);
    } catch (err) {
      console.error('[@hook:useControllers] ❌ Failed to fetch controller types:', err);
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