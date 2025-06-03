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
    setReferencesLoading(true);
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/reference/list');
      const result = await response.json();
      
      if (result.success) {
        setAvailableReferences(result.references || []);
        console.log('[@component:useVerificationReferences] Loaded references:', result.references);
      } else {
        console.error('[@component:useVerificationReferences] Failed to load references:', result.error);
      }
    } catch (error) {
      console.error('[@component:useVerificationReferences] Error fetching references:', error);
    } finally {
      setReferencesLoading(false);
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