import { useState, useEffect, useCallback } from 'react';

import { Host } from '../../types/common/Host_Types';
import { ModelReferences } from '../../types/verification/VerificationTypes';

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
      const response = await fetch('/server/verification/getAllReferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost, // Send full host object
        }),
      });

      console.log(
        `[@hook:useVerificationReferences] Fetching from: /server/verification/getAllReferences with host: ${selectedHost.host_name}`,
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[@hook:useVerificationReferences] Raw response:', result);

        if (result.success && (result.references || result.images || result.count > 0)) {
          // Server can return either { references: { image: [...], text: [...] } } or { images: [...], count: N }
          const deviceModel = result.device_model || result.model || 'unknown';
          const modelRefs: ModelReferences = {};

          // Handle new format: { images: [...], count: N }
          if (result.images && Array.isArray(result.images)) {
            result.images.forEach((ref: any, index: number) => {
              const baseName = ref.name || ref.filename || 'unknown';
              const refType = ref.type === 'reference_text' ? 'text' : 'image';

              // Create unique key: for text references, use the base name, for images add suffix if needed
              let filename = baseName;
              if (refType === 'image' && modelRefs[baseName]) {
                // If base name already exists (likely a text reference), add suffix for image
                filename = `${baseName}_image`;
                console.log(
                  `[@hook:useVerificationReferences] Duplicate name detected: ${baseName} (${refType}) -> ${filename}`,
                );
              }

              console.log(
                `[@hook:useVerificationReferences] Processing ref ${index + 1}: ${baseName} (${refType}) -> ${filename}`,
              );

              modelRefs[filename] = {
                type: refType,
                url: ref.r2_url || ref.url,
                area: ref.area || { x: 0, y: 0, width: 0, height: 0 },
                created_at: ref.created_at,
                updated_at: ref.updated_at,
                // Add text-specific fields for text references
                ...(refType === 'text' &&
                  ref.area && {
                    text: ref.area.text,
                    font_size: ref.area.font_size,
                    confidence: ref.area.confidence,
                  }),
              };
            });
          }

          // Handle old format: { references: { image: [...], text: [...] } }
          if (result.references) {
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
          }

          const allReferences = { [deviceModel]: modelRefs };

          // Count references by type for better debugging
          const imageCount = Object.values(modelRefs).filter((ref) => ref.type === 'image').length;
          const textCount = Object.values(modelRefs).filter((ref) => ref.type === 'text').length;

          console.log(
            `[@hook:useVerificationReferences] Processed ${Object.keys(modelRefs).length} references for model '${deviceModel}': ${imageCount} images, ${textCount} text`,
            Object.keys(modelRefs),
          );

          // Debug: Log each reference with its type
          Object.entries(modelRefs).forEach(([filename, ref]) => {
            console.log(
              `[@hook:useVerificationReferences] - ${filename}: ${ref.type}${ref.type === 'text' ? ` (text: "${ref.text}")` : ''}`,
            );
          });

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
