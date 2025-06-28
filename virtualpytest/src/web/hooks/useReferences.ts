import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { Host } from '../types/common/Host_Types';
import type { Actions } from '../types/controller/Action_Types';
import { ModelReferences } from '../types/verification/Verification_Types';

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
  isControlActive: boolean = false,
): UseReferencesReturn => {
  const [availableReferences, setAvailableReferences] = useState<{
    [deviceModel: string]: ModelReferences;
  }>({});
  const [availableActions, setAvailableActions] = useState<Actions>({});
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);

  // Track if we've already fetched for the current host to prevent duplicate calls
  const lastFetchedRef = useRef<{
    hostId: string | null;
    referencesLoaded: boolean;
    actionsLoaded: boolean;
    reloadTrigger: number;
  }>({
    hostId: null,
    referencesLoaded: false,
    actionsLoaded: false,
    reloadTrigger: 0,
  });

  // Create stable host identifier for comparison
  const hostId = useMemo(() => {
    return selectedHost ? `${selectedHost.host_name}_${selectedHost.host_url}` : null;
  }, [selectedHost]);

  const fetchAvailableReferences = useCallback(async () => {
    if (!isControlActive || !selectedHost) {
      console.log(
        '[@hook:useReferences] Cannot fetch references - control not active or no host selected',
      );
      return;
    }

    // Check if we should skip this fetch (already done for this host)
    const currentState = lastFetchedRef.current;
    if (
      currentState.hostId === hostId &&
      currentState.referencesLoaded &&
      currentState.reloadTrigger === reloadTrigger &&
      reloadTrigger === 0 // Only skip if it's not a manual reload
    ) {
      console.log(
        '[@hook:useReferences] Skipping references fetch - already loaded for host:',
        hostId,
      );
      return;
    }

    setReferencesLoading(true);
    try {
      console.log(
        `[@hook:useReferences] Fetching verification references for host: ${selectedHost.host_name}`,
      );

      const response = await fetch('/server/verification/getAllReferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost,
        }),
      });

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
            `[@hook:useReferences] ✅ Loaded ${Object.keys(modelRefs).length} verification references for model '${deviceModel}': ${imageCount} images, ${textCount} text`,
          );

          setAvailableReferences(allReferences);

          // Mark as loaded for this host
          lastFetchedRef.current = {
            ...lastFetchedRef.current,
            hostId,
            referencesLoaded: true,
            reloadTrigger,
          };
        } else {
          console.log('[@hook:useReferences] No verification references found in response');
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
  }, [selectedHost, isControlActive, hostId, reloadTrigger]);

  const fetchAvailableActions = useCallback(async () => {
    if (!isControlActive || !selectedHost) {
      console.log(
        '[@hook:useReferences] Cannot fetch actions - control not active or no host selected',
      );
      return;
    }

    // Check if we should skip this fetch (already done for this host)
    const currentState = lastFetchedRef.current;
    if (
      currentState.hostId === hostId &&
      currentState.actionsLoaded &&
      currentState.reloadTrigger === reloadTrigger &&
      reloadTrigger === 0 // Only skip if it's not a manual reload
    ) {
      console.log(
        '[@hook:useReferences] Skipping actions fetch - already loaded for host:',
        hostId,
      );
      return;
    }

    setActionsLoading(true);
    try {
      console.log(
        `[@hook:useReferences] Fetching available actions for host: ${selectedHost.host_name}`,
      );

      const response = await fetch('/server/system/getAvailableActions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[@hook:useReferences] Actions response:', result);

        if (result.success && result.actions && Array.isArray(result.actions)) {
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
            `[@hook:useReferences] ✅ Loaded ${totalActions} actions in ${categories} categories`,
          );

          setAvailableActions(categorizedActions);

          // Mark as loaded for this host
          lastFetchedRef.current = {
            ...lastFetchedRef.current,
            hostId,
            actionsLoaded: true,
            reloadTrigger,
          };
        } else {
          console.log('[@hook:useReferences] No actions found in response');
          setAvailableActions({});
        }
      } else if (response.status === 404) {
        console.warn(
          '[@hook:useReferences] Actions endpoint not found (404) - actions may not be available for this host',
        );
        setAvailableActions({});
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
  }, [selectedHost, isControlActive, hostId, reloadTrigger]);

  const getModelReferences = useCallback(
    (model?: string): ModelReferences => {
      if (!model || !availableReferences[model]) {
        console.log(
          `[@hook:useReferences] No verification references found for model '${model}' (available models: ${Object.keys(availableReferences).join(', ') || 'none'})`,
        );
        return {};
      }

      const modelRefs = availableReferences[model];
      console.log(
        `[@hook:useReferences] Found ${Object.keys(modelRefs).length} verification references for model '${model}'`,
      );
      return modelRefs;
    },
    [availableReferences],
  );

  const getModelActions = useCallback(
    (_model?: string): Actions => {
      console.log(
        `[@hook:useReferences] Found ${Object.keys(availableActions).length} action categories`,
      );
      return availableActions;
    },
    [availableActions],
  );

  // Effect for host changes - only clear if host actually changes
  useEffect(() => {
    if (hostId !== lastFetchedRef.current.hostId) {
      console.log(
        `[@hook:useReferences] Host changed from ${lastFetchedRef.current.hostId} to ${hostId}, clearing cache`,
      );
      // Reset the tracking state for new host
      lastFetchedRef.current = {
        hostId,
        referencesLoaded: false,
        actionsLoaded: false,
        reloadTrigger: 0,
      };
      // Clear existing data
      setAvailableReferences({});
      setAvailableActions({});
    }
  }, [hostId]);

  // Effect for control activation - fetch when control becomes active
  useEffect(() => {
    if (isControlActive && selectedHost && hostId) {
      console.log(
        `[@hook:useReferences] Control active for host: ${selectedHost.host_name}, checking if data needs loading`,
      );

      // Only fetch if not already loaded for this host
      if (!lastFetchedRef.current.referencesLoaded || lastFetchedRef.current.hostId !== hostId) {
        fetchAvailableReferences();
      }

      if (!lastFetchedRef.current.actionsLoaded || lastFetchedRef.current.hostId !== hostId) {
        fetchAvailableActions();
      }
    }
    // Note: We don't clear data when control becomes inactive - keep it cached
  }, [isControlActive, selectedHost, hostId, fetchAvailableReferences, fetchAvailableActions]);

  // Effect for reload trigger (manual refresh)
  useEffect(() => {
    if (reloadTrigger > 0 && isControlActive && selectedHost) {
      console.log(
        `[@hook:useReferences] Manual reload triggered (${reloadTrigger}) for host: ${selectedHost.host_name}`,
      );

      // Force reload regardless of cache state
      lastFetchedRef.current = {
        ...lastFetchedRef.current,
        referencesLoaded: false,
        actionsLoaded: false,
        reloadTrigger,
      };

      fetchAvailableReferences();
      fetchAvailableActions();
    }
  }, [
    reloadTrigger,
    fetchAvailableReferences,
    fetchAvailableActions,
    isControlActive,
    selectedHost,
  ]);

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
