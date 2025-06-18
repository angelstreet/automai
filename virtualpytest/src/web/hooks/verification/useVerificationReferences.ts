import { useState, useEffect } from 'react';

import { buildServerUrl } from '../../utils/frontendUtils';
import { Host } from '../../types/common/Host_Types';

interface ReferenceImage {
  name: string;
  model: string;
  cloudflare_url: string;
  filename: string;
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

export const useVerificationReferences = (
  reloadTrigger: number = 0,
  selectedHost: Host | null,
): UseVerificationReferencesReturn => {
  const [availableReferences, setAvailableReferences] = useState<ReferenceImage[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);

  const fetchAvailableReferences = async () => {
    setReferencesLoading(true);
    try {
      console.log('[@hook:useVerificationReferences] Fetching available references...');

      // Check if we have a selected host
      if (!selectedHost) {
        console.warn('[@hook:useVerificationReferences] No host selected, cannot fetch references');
        setAvailableReferences([]);
        setReferencesLoading(false);
        return;
      }

      // Build URL with host_name query parameter as required by the server routes
      const url = new URL(buildServerUrl('/server/verification/getAllReferences'));
      url.searchParams.append('host_name', selectedHost.host_name);

      console.log(`[@hook:useVerificationReferences] Fetching from: ${url.toString()}`);

      const response = await fetch(url.toString());

      if (response.ok) {
        const result = await response.json();
        console.log('[@hook:useVerificationReferences] Raw response:', result);

        if (result.success && result.references) {
          // Process references from grouped structure (image/text arrays)
          const allReferences: ReferenceImage[] = [];

          // Process image references
          if (result.references.image) {
            result.references.image.forEach((ref: any) => {
              allReferences.push({
                name: ref.name,
                model: ref.model,
                cloudflare_url: ref.cloudflare_url,
                filename: ref.filename,
                created_at: ref.created_at,
                type: 'image',
                area: ref.area || { x: 0, y: 0, width: 0, height: 0 },
              });
            });
          }

          // Process text references
          if (result.references.text) {
            result.references.text.forEach((ref: any) => {
              allReferences.push({
                name: ref.name,
                model: ref.model,
                cloudflare_url: ref.cloudflare_url,
                filename: ref.filename,
                created_at: ref.created_at,
                type: 'text',
                area: ref.area || { x: 0, y: 0, width: 0, height: 0 },
                text: ref.text,
                font_size: ref.font_size,
                confidence: ref.confidence,
              });
            });
          }

          console.log(`[@hook:useVerificationReferences] Found ${allReferences.length} references`);

          setAvailableReferences(allReferences);
          console.log('[@hook:useVerificationReferences] Processed references:', allReferences);
        } else {
          console.log('[@hook:useVerificationReferences] No references found or request failed');
          setAvailableReferences([]);
        }
      } else {
        console.error(
          '[@hook:useVerificationReferences] Failed to fetch references:',
          response.status,
        );
        setAvailableReferences([]);
      }
    } catch (error) {
      console.error('[@hook:useVerificationReferences] Error fetching references:', error);
      setAvailableReferences([]);
    } finally {
      setReferencesLoading(false);
    }
  };

  // Filter references by current model
  const getModelReferences = (model?: string) => {
    if (!model) return availableReferences;
    const filtered = availableReferences.filter((ref) => ref.model === model);
    console.log(
      `[@component:useVerificationReferences] Filtered references for model '${model}':`,
      filtered,
    );
    return filtered;
  };

  // Fetch references on mount and when reload trigger changes
  useEffect(() => {
    fetchAvailableReferences();
  }, [reloadTrigger, selectedHost]); // Add selectedHost as dependency

  return {
    availableReferences,
    referencesLoading,
    fetchAvailableReferences,
    getModelReferences,
  };
};
