import { useState, useEffect, useCallback } from 'react';

import { Host } from '../../types/common/Host_Types';
import { ReferenceImage } from '../../types/verification/VerificationTypes';
import { buildServerUrl } from '../../utils/frontendUtils';

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

  const fetchAvailableReferences = useCallback(async () => {
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

      // Use POST method with full host object (consistent with other hooks)
      const response = await fetch(buildServerUrl('/server/verification/getAllReferences'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost, // Send full host object
        }),
      });

      console.log(
        `[@hook:useVerificationReferences] Fetching from: ${buildServerUrl('/server/verification/getAllReferences')} with host: ${selectedHost.host_name}`,
      );

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
                url: ref.url,
                filename: ref.filename,
                created_at: ref.created_at,
                updated_at: ref.updated_at,
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
                url: ref.url,
                filename: ref.filename,
                created_at: ref.created_at,
                updated_at: ref.updated_at,
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
  }, [selectedHost]);

  // Filter references by current model
  const getModelReferences = useCallback(
    (model?: string) => {
      if (!model) return availableReferences;
      const filtered = availableReferences.filter((ref) => ref.model === model);
      console.log(
        `[@component:useVerificationReferences] Filtered references for model '${model}':`,
        filtered,
      );
      return filtered;
    },
    [availableReferences],
  );

  // Fetch references on mount and when reload trigger changes
  useEffect(() => {
    fetchAvailableReferences();
  }, [reloadTrigger, fetchAvailableReferences]);

  return {
    availableReferences,
    referencesLoading,
    fetchAvailableReferences,
    getModelReferences,
  };
};
