import { useState, useEffect } from 'react';

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
  const [controllerTypes, setControllerTypes] = useState<ControllerTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControllerTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5009/api/virtualpytest/controller-types');
      
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