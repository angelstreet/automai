import { useState, useEffect } from 'react';

interface ReferenceImage {
  name: string;
  model: string;
  path: string;
  full_path: string;
  created_at: string;
  type: 'image' | 'text';
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Text reference specific fields
  text?: string;
  font_size?: number;
  confidence?: number;
}

interface UseVerificationReferencesReturn {
  availableReferences: ReferenceImage[];
  referencesLoading: boolean;
  fetchAvailableReferences: () => void;
  getModelReferences: (model?: string) => ReferenceImage[];
}

export const useVerificationReferences = (reloadTrigger?: number): UseVerificationReferencesReturn => {
  const [availableReferences, setAvailableReferences] = useState<ReferenceImage[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);

  // Fetch available reference images
  const fetchAvailableReferences = async () => {
    try {
      console.log('[@component:useVerificationReferences] Fetching available references');
      const response = await fetch('http://192.168.1.67:5009/api/virtualpytest/reference/list');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[@component:useVerificationReferences] References fetched:', data);
      
      if (data.success) {
        setAvailableReferences(data.references || []);
      } else {
        console.error('[@component:useVerificationReferences] Failed to fetch references:', data.error);
      }
    } catch (error) {
      console.error('[@component:useVerificationReferences] Error fetching references:', error);
    }
  };

  // Filter references by current model
  const getModelReferences = (model?: string) => {
    if (!model) return availableReferences;
    return availableReferences.filter(ref => ref.model === model);
  };

  // Fetch available reference images on component mount
  useEffect(() => {
    fetchAvailableReferences();
  }, []);

  // Reload references when reloadTrigger changes
  useEffect(() => {
    if (reloadTrigger && reloadTrigger > 0) {
      console.log('[@component:useVerificationReferences] Reloading references due to trigger:', reloadTrigger);
      fetchAvailableReferences();
    }
  }, [reloadTrigger]);

  return {
    availableReferences,
    referencesLoading,
    fetchAvailableReferences,
    getModelReferences
  };
}; 