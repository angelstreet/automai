import { useState, useEffect, useCallback } from 'react';

import { Host } from '../../types/common/Host_Types';
import { ModelReferences } from '../../types/verification/VerificationTypes';
import { buildServerUrl } from '../../utils/frontendUtils';

interface UseVerificationReferencesReturn {
  availableReferences: { [deviceModel: string]: ModelReferences };
  referencesLoading: boolean;
  fetchAvailableReferences: () => void;
  getModelReferences: (model?: string) => ModelReferences;
}

export const useVerificationReferences = (
  reloadTrigger: number = 0,
  selectedHost: Host | null,
): UseVerificationReferencesReturn => {
  const [availableReferences, setAvailableReferences] = useState<{
    [deviceModel: string]: ModelReferences;
  }>({});
  const [referencesLoading, setReferencesLoading] = useState(false);

  const fetchAvailableReferences = useCallback(async () => {
    setReferencesLoading(true);
    try {
      console.log('[@hook:useVerificationReferences] Fetching available references...');

      // Check if we have a selected host
      if (!selectedHost) {
        console.warn('[@hook:useVerificationReferences] No host selected, cannot fetch references');
        setAvailableReferences({});
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
          // Server returns references grouped by type: { image: [...], text: [...] }
          // We need to convert this to our dictionary format: { model: { filename: ref } }
          const deviceModel = result.model || selectedHost.device_model;
          const modelRefs: ModelReferences = {};

          // Process image references
          if (result.references.image && Array.isArray(result.references.image)) {
            result.references.image.forEach((ref: any) => {
              const filename = ref.filename || ref.name || 'unknown.png';
              modelRefs[filename] = {
                type: 'image',
                url: ref.url,
                area: ref.area || { x: 0, y: 0, width: 0, height: 0 },
                created_at: ref.created_at,
                updated_at: ref.updated_at,
              };
            });
          }

          // Process text references
          if (result.references.text && Array.isArray(result.references.text)) {
            result.references.text.forEach((ref: any) => {
              const filename = ref.filename || ref.name || 'unknown.json';
              modelRefs[filename] = {
                type: 'text',
                url: ref.url,
                area: ref.area || { x: 0, y: 0, width: 0, height: 0 },
                created_at: ref.created_at,
                updated_at: ref.updated_at,
                text: ref.text,
                font_size: ref.font_size,
                confidence: ref.confidence,
              };
            });
          }

          const allReferences = { [deviceModel]: modelRefs };

          console.log(
            `[@hook:useVerificationReferences] Processed ${Object.keys(modelRefs).length} references for model '${deviceModel}':`,
            Object.keys(modelRefs),
          );
          setAvailableReferences(allReferences);
        } else {
          console.log('[@hook:useVerificationReferences] No references found or request failed');
          setAvailableReferences({});
        }
      } else {
        console.error(
          '[@hook:useVerificationReferences] Failed to fetch references:',
          response.status,
        );
        setAvailableReferences({});
      }
    } catch (error) {
      console.error('[@hook:useVerificationReferences] Error fetching references:', error);
      setAvailableReferences({});
    } finally {
      setReferencesLoading(false);
    }
  }, [selectedHost]);

  // Get references for a specific model (returns dictionary)
  const getModelReferences = useCallback(
    (model?: string): ModelReferences => {
      if (!model || !availableReferences[model]) {
        console.log(`[@hook:useVerificationReferences] No references found for model '${model}'`);
        return {};
      }

      const modelRefs = availableReferences[model];
      console.log(
        `[@hook:useVerificationReferences] Found ${Object.keys(modelRefs).length} references for model '${model}':`,
        Object.keys(modelRefs),
      );
      return modelRefs;
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
