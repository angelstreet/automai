import { useState, useEffect, useCallback } from 'react';

import { Host } from '../types/common/Host_Types';
import { ModelReferences } from '../types/verification/VerificationTypes';
import type { Actions } from '../types/controller/ActionTypes';

type ReferenceType = 'verification' | 'action';

interface UseReferencesReturn {
  availableReferences: { [deviceModel: string]: ModelReferences };
  availableActions: Actions;
  referencesLoading: boolean;
  actionsLoading: boolean;
  fetchAvailableReferences: () => void;
  fetchAvailableActions: () => void;
  getModelReferences: (model?: string) => ModelReferences;
  getModelActions: (model?: string) => Actions;
}

export const useReferences = (
  reloadTrigger: number = 0,
  selectedHost: Host | null,
): UseReferencesReturn => {
  const [availableReferences, setAvailableReferences] = useState<{
    [deviceModel: string]: ModelReferences;
  }>({});
  const [availableActions, setAvailableActions] = useState<Actions>({});
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);

  const fetchAvailableReferences = useCallback(async () => {
    setReferencesLoading(true);
    try {
      console.log('[@hook:useReferences] Fetching verification references...');

      if (!selectedHost) {
        console.warn(
          '[@hook:useReferences] No host selected, cannot fetch verification references',
        );
        setAvailableReferences({});
        setReferencesLoading(false);
        return;
      }

      const response = await fetch('/server/verification/getAllReferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost,
        }),
      });

      console.log(
        `[@hook:useReferences] Fetching verification references from: /server/verification/getAllReferences with host: ${selectedHost.host_name}`,
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[@hook:useReferences] Verification references response:', result);

        if (result.success && result.images && Array.isArray(result.images)) {
          const deviceModel = result.device_model || result.model || 'unknown';
          const modelRefs: ModelReferences = {};

          result.images.forEach((ref: any, index: number) => {
            const baseName = ref.name || ref.filename || 'unknown';
            const refType = ref.type === 'reference_text' ? 'text' : 'image';

            let filename = baseName;
            if (refType === 'image' && modelRefs[baseName]) {
              filename = `${baseName}_image`;
              console.log(
                `[@hook:useReferences] Duplicate name detected: ${baseName} (${refType}) -> ${filename}`,
              );
            }

            console.log(
              `[@hook:useReferences] Processing verification ref ${index + 1}: ${baseName} (${refType}) -> ${filename}`,
            );

            modelRefs[filename] = {
              type: refType,
              url: ref.r2_url || ref.url,
              area: ref.area || { x: 0, y: 0, width: 0, height: 0 },
              created_at: ref.created_at,
              updated_at: ref.updated_at,
              ...(refType === 'text' &&
                ref.area && {
                  text: ref.area.text,
                  font_size: ref.area.font_size,
                  confidence: ref.area.confidence,
                }),
            };
          });

          const allReferences = { [deviceModel]: modelRefs };
          const imageCount = Object.values(modelRefs).filter((ref) => ref.type === 'image').length;
          const textCount = Object.values(modelRefs).filter((ref) => ref.type === 'text').length;

          console.log(
            `[@hook:useReferences] Processed ${Object.keys(modelRefs).length} verification references for model '${deviceModel}': ${imageCount} images, ${textCount} text`,
            Object.keys(modelRefs),
          );

          setAvailableReferences(allReferences);
        } else {
          console.log('[@hook:useReferences] No verification references found');
          setAvailableReferences({});
        }
      } else {
        console.error(
          '[@hook:useReferences] Failed to fetch verification references:',
          response.status,
        );
        setAvailableReferences({});
      }
    } catch (error) {
      console.error('[@hook:useReferences] Error fetching verification references:', error);
      setAvailableReferences({});
    } finally {
      setReferencesLoading(false);
    }
  }, [selectedHost]);

  const fetchAvailableActions = useCallback(async () => {
    setActionsLoading(true);
    try {
      console.log('[@hook:useReferences] Fetching available actions...');

      if (!selectedHost) {
        console.warn('[@hook:useReferences] No host selected, cannot fetch actions');
        setAvailableActions({});
        setActionsLoading(false);
        return;
      }

      const response = await fetch('/server/system/getAvailableActions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost,
        }),
      });

      console.log(
        `[@hook:useReferences] Fetching actions from: /server/system/getAvailableActions with host: ${selectedHost.host_name}`,
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[@hook:useReferences] Actions response:', result);

        if (result.success && result.actions && Array.isArray(result.actions)) {
          // Transform flat action list to categorized structure
          const categorizedActions: Actions = {};

          result.actions.forEach((action: any) => {
            const category = action.category || action.action_type || 'unknown';
            if (!categorizedActions[category]) {
              categorizedActions[category] = [];
            }
            categorizedActions[category].push({
              id: action.id,
              label: action.label,
              command: action.command,
              description: action.description,
              action_type: action.action_type || category,
              params: action.params || {},
              requiresInput: action.requiresInput || false,
              inputLabel: action.inputLabel,
              inputPlaceholder: action.inputPlaceholder,
            });
          });

          const totalActions = result.actions.length;
          const categories = Object.keys(categorizedActions).length;

          console.log(
            `[@hook:useReferences] Processed ${totalActions} actions in ${categories} categories:`,
            Object.keys(categorizedActions),
          );

          setAvailableActions(categorizedActions);
        } else {
          console.log('[@hook:useReferences] No actions found');
          setAvailableActions({});
        }
      } else {
        console.error('[@hook:useReferences] Failed to fetch actions:', response.status);
        setAvailableActions({});
      }
    } catch (error) {
      console.error('[@hook:useReferences] Error fetching actions:', error);
      setAvailableActions({});
    } finally {
      setActionsLoading(false);
    }
  }, [selectedHost]);

  // Get references for a specific model
  const getModelReferences = useCallback(
    (model?: string): ModelReferences => {
      if (!model || !availableReferences[model]) {
        console.log(`[@hook:useReferences] No verification references found for model '${model}'`);
        return {};
      }

      const modelRefs = availableReferences[model];
      console.log(
        `[@hook:useReferences] Found ${Object.keys(modelRefs).length} verification references for model '${model}':`,
        Object.keys(modelRefs),
      );
      return modelRefs;
    },
    [availableReferences],
  );

  // Get actions for a specific model
  const getModelActions = useCallback(
    (model?: string): Actions => {
      // Actions are not model-specific, return all available actions
      console.log(
        `[@hook:useReferences] Found ${Object.keys(availableActions).length} action categories`,
        Object.keys(availableActions),
      );
      return availableActions;
    },
    [availableActions],
  );

  // REMOVED: Automatic fetching on mount - now only fetch when explicitly called
  // We only fetch when reloadTrigger changes (e.g., after saving a new reference)
  useEffect(() => {
    if (reloadTrigger > 0) {
      console.log(
        '[@hook:useReferences] Reload trigger changed, fetching references and actions:',
        reloadTrigger,
      );
      fetchAvailableReferences();
      fetchAvailableActions();
    }
  }, [reloadTrigger, fetchAvailableReferences, fetchAvailableActions]);

  return {
    availableReferences,
    availableActions,
    referencesLoading,
    actionsLoading,
    fetchAvailableReferences,
    fetchAvailableActions,
    getModelReferences,
    getModelActions,
  };
};
