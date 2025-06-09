import { useState, useEffect } from 'react';
import { useRegistration } from '../../contexts/RegistrationContext';
import { ControllerTypes } from '../../types/remote/types';

export function useControllerTypes() {
  const { buildApiUrl } = useRegistration();
  const [controllerTypes, setControllerTypes] = useState<ControllerTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControllerTypes = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching controller types from backend...');
      
      // Use RegistrationContext to build URL
      const response = await fetch(buildApiUrl('/api/controller/controller-types'));
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('✅ Controller types received:', Object.keys(data.controller_types));
      
      setControllerTypes(data.controller_types);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch controller types:', err);
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