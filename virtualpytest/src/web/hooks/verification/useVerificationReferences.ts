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

  // Fetch available reference images from local resource.json file
  const fetchAvailableReferences = async () => {
    try {
      setReferencesLoading(true);
      console.log('[@component:useVerificationReferences] Fetching available references from local resource.json');
      
      // Import the resource.json file directly
      const resourceData = await import('../../../config/resource/resource.json');
      console.log('[@component:useVerificationReferences] Raw resource data:', resourceData);
      
      // Extract resources array from the imported data
      const resources = resourceData.default?.resources || resourceData.resources || [];
      console.log('[@component:useVerificationReferences] Extracted resources:', resources);
      
      // Map the resources to the expected ReferenceImage format
      const mappedReferences: ReferenceImage[] = resources.map((resource: any) => ({
        name: resource.name,
        model: resource.model,
        path: resource.path || '',
        full_path: resource.full_path || '',
        created_at: resource.created_at,
        type: resource.type === 'reference_image' ? 'image' : 'text',
        area: resource.area,
        text: resource.text,
        font_size: resource.font_size,
        confidence: resource.confidence
      }));
      
      console.log('[@component:useVerificationReferences] Mapped references:', mappedReferences);
      setAvailableReferences(mappedReferences);
      
    } catch (error) {
      console.error('[@component:useVerificationReferences] Error loading references from resource.json:', error);
      
      // Fallback: try to fetch from API if local file fails
      try {
        console.log('[@component:useVerificationReferences] Falling back to API fetch');
        const response = await fetch('http://localhost:5009/api/virtualpytest/reference/list');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[@component:useVerificationReferences] API References fetched:', data);
        
        if (data.success) {
          setAvailableReferences(data.references || []);
        } else {
          console.error('[@component:useVerificationReferences] Failed to fetch references from API:', data.error);
        }
      } catch (apiError) {
        console.error('[@component:useVerificationReferences] API fallback also failed:', apiError);
      }
    } finally {
      setReferencesLoading(false);
    }
  };

  // Filter references by current model
  const getModelReferences = (model?: string) => {
    if (!model) return availableReferences;
    const filtered = availableReferences.filter(ref => ref.model === model);
    console.log(`[@component:useVerificationReferences] Filtered references for model '${model}':`, filtered);
    return filtered;
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