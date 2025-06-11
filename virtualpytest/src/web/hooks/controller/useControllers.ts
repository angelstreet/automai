import { useState, useEffect } from 'react';
import { ControllerTypesResponse } from '../../types/controller/Remote_Types';

export function useControllers() {
  const [controllerTypes, setControllerTypes] = useState<ControllerTypesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControllerTypes = async () => {
    try {
      setLoading(true);
      console.log('[@hook:useControllers] 🔍 Fetching controller types from backend...');
      
      // Updated API endpoint to use server/control route
      const response = await fetch('/server/control/getAllControllers');
      console.log('[@hook:useControllers] 📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[@hook:useControllers] ✅ Successfully fetched controller types:', data);
      
      // Extract the controller_types from the API response
      let controllerTypesData = data.controller_types || data;
      
      // Validate that we have the expected structure
      if (!controllerTypesData || typeof controllerTypesData !== 'object') {
        throw new Error('Invalid API response: missing controller types data');
      }
      
      // Ensure all expected controller type arrays exist
      const expectedTypes = ['remote', 'av', 'network', 'verification', 'power'];
      for (const type of expectedTypes) {
        if (!Array.isArray(controllerTypesData[type])) {
          console.warn(`[@hook:useControllers] ⚠️ Missing or invalid ${type} controllers, initializing as empty array`);
          controllerTypesData[type] = [];
        }
      }
      
      console.log('[@hook:useControllers] 📋 Validated controller types data:', controllerTypesData);
      
      setControllerTypes(controllerTypesData);
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
  }, []);

  return {
    controllerTypes,
    loading,
    error,
    refetch: fetchControllerTypes
  };
} 