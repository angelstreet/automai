import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';

import { Host } from '../../types/common/Host_Types';
import type { Actions } from '../../types/controller/Action_Types';
import { ModelReferences } from '../../types/verification/Verification_Types';

// ========================================
// TYPES
// ========================================

interface DeviceDataState {
  // References data
  references: { [deviceModel: string]: ModelReferences };
  referencesLoading: boolean;
  referencesError: string | null;

  // Available actions data (controller capabilities)
  availableActions: Actions;
  availableActionsLoading: boolean;
  availableActionsError: string | null;

  // Saved actions data (from DB for current model)
  actions: any[];
  actionsLoading: boolean;
  actionsError: string | null;

  // Available verification types data (controller capabilities)
  availableVerificationTypes: Record<string, any>;
  availableVerificationTypesLoading: boolean;
  availableVerificationTypesError: string | null;

  // Saved verifications data (from DB for current model)
  verifications: any[];
  verificationsLoading: boolean;
  verificationsError: string | null;

  // Host tracking
  currentHost: Host | null;
  currentDeviceId: string | null;
  isControlActive: boolean;
}

interface DeviceDataActions {
  // Data fetching
  fetchReferences: (force?: boolean) => Promise<void>;
  fetchAvailableActions: (force?: boolean) => Promise<void>;
  fetchAvailableVerifications: (force?: boolean) => Promise<void>;
  fetchActions: (force?: boolean) => Promise<void>;
  fetchVerifications: (force?: boolean) => Promise<void>;
  fetchAllData: (force?: boolean) => Promise<void>;

  // Data access helpers
  getModelReferences: (model: string) => ModelReferences;
  getAvailableActions: () => Actions;
  getActions: () => any[];
  getAvailableVerificationTypes: () => Record<string, any>;
  getVerifications: () => any[];

  // State management
  setControlState: (host: Host | null, deviceId: string | null, isActive: boolean) => void;
  clearData: () => void;
  reloadData: () => Promise<void>;
}

type DeviceDataContextType = DeviceDataState & DeviceDataActions;

// ========================================
// CONTEXT
// ========================================

const DeviceDataContext = createContext<DeviceDataContextType | undefined>(undefined);

export const useDeviceData = (): DeviceDataContextType => {
  const context = useContext(DeviceDataContext);
  if (context === undefined) {
    throw new Error('useDeviceData must be used within a DeviceDataProvider');
  }
  return context;
};

// ========================================
// PROVIDER
// ========================================

interface DeviceDataProviderProps {
  children: React.ReactNode;
}

export const DeviceDataProvider: React.FC<DeviceDataProviderProps> = ({ children }) => {
  // ========================================
  // STATE
  // ========================================

  const [state, setState] = useState<DeviceDataState>({
    references: {},
    referencesLoading: false,
    referencesError: null,
    availableActions: {},
    availableActionsLoading: false,
    availableActionsError: null,
    actions: [],
    actionsLoading: false,
    actionsError: null,
    availableVerificationTypes: {},
    availableVerificationTypesLoading: false,
    availableVerificationTypesError: null,
    verifications: [],
    verificationsLoading: false,
    verificationsError: null,
    currentHost: null,
    currentDeviceId: null,
    isControlActive: false,
  });

  // Track what's been loaded to prevent duplicate fetches
  const loadedDataRef = useRef<{
    hostId: string | null;
    referencesLoaded: boolean;
    availableActionsLoaded: boolean;
    availableVerificationTypesLoaded: boolean;
    actionsLoaded: boolean;
    verificationsLoaded: boolean;
  }>({
    hostId: null,
    referencesLoaded: false,
    availableActionsLoaded: false,
    availableVerificationTypesLoaded: false,
    actionsLoaded: false,
    verificationsLoaded: false,
  });

  // Create stable host identifier
  const hostId = useMemo(() => {
    return state.currentHost
      ? `${state.currentHost.host_name}_${state.currentHost.host_url}`
      : null;
  }, [state.currentHost]);

  // ========================================
  // DATA FETCHING FUNCTIONS
  // ========================================

  const fetchReferences = useCallback(
    async (force: boolean = false) => {
      if (!state.isControlActive || !state.currentHost) {
        console.log('[DeviceDataContext] Cannot fetch references - control not active or no host');
        return;
      }

      // Check if already loaded (unless forced)
      if (
        !force &&
        loadedDataRef.current.hostId === hostId &&
        loadedDataRef.current.referencesLoaded
      ) {
        console.log('[DeviceDataContext] References already loaded for host:', hostId);
        return;
      }

      setState((prev) => ({ ...prev, referencesLoading: true, referencesError: null }));

      try {
        console.log(
          `[DeviceDataContext] Fetching references for host: ${state.currentHost.host_name}`,
        );

        const response = await fetch('/server/verification/getAllReferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: state.currentHost }),
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.references && Array.isArray(result.references)) {
            const references: { [deviceModel: string]: ModelReferences } = {};

            result.references.forEach((ref: any) => {
              const deviceModel = ref.device_model || 'unknown';
              const baseName = ref.name || ref.filename || 'unknown';
              const refType = ref.reference_type === 'reference_text' ? 'text' : 'image';

              // Initialize model references if not exists
              if (!references[deviceModel]) {
                references[deviceModel] = {};
              }

              // Create internal key with type suffix to avoid conflicts
              // But preserve original name for display in UI
              const internalKey = `${baseName}_${refType}`;

              references[deviceModel][internalKey] = {
                name: baseName, // Store original name for display
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

            // Log loaded references for each device model
            Object.entries(references).forEach(([deviceModel, modelRefs]) => {
              const imageCount = Object.values(modelRefs).filter(
                (ref) => ref.type === 'image',
              ).length;
              const textCount = Object.values(modelRefs).filter(
                (ref) => ref.type === 'text',
              ).length;
              console.log(
                `[DeviceDataContext] ✅ Loaded ${Object.keys(modelRefs).length} references for '${deviceModel}': ${imageCount} images, ${textCount} text`,
              );
            });

            setState((prev) => ({ ...prev, references, referencesLoading: false }));
            loadedDataRef.current.referencesLoaded = true;
          } else {
            setState((prev) => ({ ...prev, references: {}, referencesLoading: false }));
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('[DeviceDataContext] Error fetching references:', error);
        setState((prev) => ({
          ...prev,
          referencesLoading: false,
          referencesError: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [state.currentHost, state.isControlActive, hostId],
  );

  const fetchAvailableActions = useCallback(
    async (force: boolean = false) => {
      if (!state.isControlActive || !state.currentHost) {
        console.log(
          '[DeviceDataContext] Cannot fetch available actions - control not active or no host',
        );
        return;
      }

      // Check if already loaded (unless forced)
      if (
        !force &&
        loadedDataRef.current.hostId === hostId &&
        loadedDataRef.current.availableActionsLoaded
      ) {
        console.log('[DeviceDataContext] Available actions already loaded for host:', hostId);
        return;
      }

      setState((prev) => ({ ...prev, availableActionsLoading: true, availableActionsError: null }));

      try {
        console.log(
          `[DeviceDataContext] Loading available actions from device data for host: ${state.currentHost.host_name}`,
        );

        // Get available actions directly from device data in the host payload
        const categorizedActions: Actions = {};
        let totalActions = 0;

        // Process all devices in the host
        state.currentHost.devices?.forEach((device: any) => {
          const deviceActionTypes = device.device_action_types || {};

          // Process each action category (remote, av, power, etc.)
          Object.keys(deviceActionTypes).forEach((category) => {
            const actions = deviceActionTypes[category];
            if (Array.isArray(actions)) {
              if (!categorizedActions[category]) {
                categorizedActions[category] = [];
              }

              actions.forEach((action: any) => {
                categorizedActions[category].push({
                  id: action.id || `${action.command}_${category}`,
                  label: action.label || action.command,
                  command: action.command,
                  description: action.description || `${action.command} action`,
                  action_type: action.action_type || category,
                  params: action.params || {},
                  requiresInput: action.requiresInput || false,
                  inputLabel: action.inputLabel,
                  inputPlaceholder: action.inputPlaceholder,
                });
                totalActions++;
              });
            }
          });
        });

        const categories = Object.keys(categorizedActions).length;

        console.log(
          `[DeviceDataContext] ✅ Loaded ${totalActions} available actions in ${categories} categories from device data`,
        );

        setState((prev) => ({
          ...prev,
          availableActions: categorizedActions,
          availableActionsLoading: false,
        }));
        loadedDataRef.current.availableActionsLoaded = true;
      } catch (error) {
        console.error(
          '[DeviceDataContext] Error loading available actions from device data:',
          error,
        );
        setState((prev) => ({
          ...prev,
          availableActionsLoading: false,
          availableActionsError: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [state.currentHost, state.isControlActive, hostId],
  );

  const fetchAvailableVerifications = useCallback(
    async (force: boolean = false) => {
      if (!state.isControlActive || !state.currentHost) {
        console.log(
          '[DeviceDataContext] Cannot fetch available verifications - control not active or no host',
        );
        return;
      }

      // Check if already loaded (unless forced)
      if (
        !force &&
        loadedDataRef.current.hostId === hostId &&
        loadedDataRef.current.availableVerificationTypesLoaded
      ) {
        console.log('[DeviceDataContext] Available verifications already loaded for host:', hostId);
        return;
      }

      setState((prev) => ({
        ...prev,
        availableVerificationTypesLoading: true,
        availableVerificationTypesError: null,
      }));

      try {
        console.log(
          `[DeviceDataContext] Loading available verifications from device data for host: ${state.currentHost.host_name}`,
        );

        // Get available verifications directly from device data in the host payload
        const allVerificationTypes: Record<string, any> = {};

        // Process all devices in the host
        state.currentHost.devices?.forEach((device: any) => {
          const deviceVerificationTypes = device.device_verification_types || {};

          // Merge device verification types into all_verification_types
          Object.keys(deviceVerificationTypes).forEach((category) => {
            const verifications = deviceVerificationTypes[category];
            if (Array.isArray(verifications)) {
              if (!allVerificationTypes[category]) {
                allVerificationTypes[category] = [];
              }
              allVerificationTypes[category].push(...verifications);
            }
          });
        });

        console.log(
          '[DeviceDataContext] ✅ Loaded available verifications from device data:',
          allVerificationTypes,
        );

        setState((prev) => ({
          ...prev,
          availableVerificationTypes: allVerificationTypes,
          availableVerificationTypesLoading: false,
        }));
        loadedDataRef.current.availableVerificationTypesLoaded = true;
      } catch (error) {
        console.error(
          '[DeviceDataContext] Error loading available verifications from device data:',
          error,
        );
        setState((prev) => ({
          ...prev,
          availableVerificationTypesLoading: false,
          availableVerificationTypesError: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [state.currentHost, state.isControlActive, hostId],
  );

  const fetchActions = useCallback(
    async (force: boolean = false) => {
      if (!state.isControlActive || !state.currentHost || !state.currentDeviceId) {
        console.log(
          '[DeviceDataContext] Cannot fetch actions - control not active, no host, or no device',
        );
        return;
      }

      // Check if already loaded (unless forced)
      if (
        !force &&
        loadedDataRef.current.hostId === hostId &&
        loadedDataRef.current.actionsLoaded
      ) {
        console.log('[DeviceDataContext] Actions already loaded for host:', hostId);
        return;
      }

      setState((prev) => ({ ...prev, actionsLoading: true, actionsError: null }));

      try {
        const device = state.currentHost.devices?.find(
          (d) => d.device_id === state.currentDeviceId,
        );
        const deviceModel = device?.device_model;

        if (!deviceModel) {
          throw new Error('Device model not found');
        }

        console.log(`[DeviceDataContext] Fetching actions for device model: ${deviceModel}`);

        const response = await fetch(
          `/server/actions/getActions?device_model=${encodeURIComponent(deviceModel)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.actions && Array.isArray(result.actions)) {
            console.log(
              `[DeviceDataContext] ✅ Loaded ${result.actions.length} saved actions for model '${deviceModel}'`,
            );

            setState((prev) => ({ ...prev, actions: result.actions, actionsLoading: false }));
            loadedDataRef.current.actionsLoaded = true;
          } else {
            setState((prev) => ({ ...prev, actions: [], actionsLoading: false }));
          }
        } else if (response.status === 404) {
          console.warn('[DeviceDataContext] Actions endpoint not found (404)');
          setState((prev) => ({ ...prev, actions: [], actionsLoading: false }));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('[DeviceDataContext] Error fetching actions:', error);
        setState((prev) => ({
          ...prev,
          actionsLoading: false,
          actionsError: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [state.currentHost, state.currentDeviceId, state.isControlActive, hostId],
  );

  const fetchVerifications = useCallback(
    async (force: boolean = false) => {
      if (!state.isControlActive || !state.currentHost || !state.currentDeviceId) {
        console.log(
          '[DeviceDataContext] Cannot fetch verifications - control not active, no host, or no device',
        );
        return;
      }

      // Check if already loaded (unless forced)
      if (
        !force &&
        loadedDataRef.current.hostId === hostId &&
        loadedDataRef.current.verificationsLoaded
      ) {
        console.log('[DeviceDataContext] Verifications already loaded for host:', hostId);
        return;
      }

      setState((prev) => ({ ...prev, verificationsLoading: true, verificationsError: null }));

      try {
        const device = state.currentHost.devices?.find(
          (d) => d.device_id === state.currentDeviceId,
        );
        const deviceModel = device?.device_model;

        if (!deviceModel) {
          throw new Error('Device model not found');
        }

        console.log(`[DeviceDataContext] Fetching verifications for device model: ${deviceModel}`);

        const response = await fetch(
          `/server/verification/getVerifications?device_model=${encodeURIComponent(deviceModel)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.verifications && Array.isArray(result.verifications)) {
            console.log(
              `[DeviceDataContext] ✅ Loaded ${result.verifications.length} saved verifications for model '${deviceModel}'`,
            );

            setState((prev) => ({
              ...prev,
              verifications: result.verifications,
              verificationsLoading: false,
            }));
            loadedDataRef.current.verificationsLoaded = true;
          } else {
            setState((prev) => ({ ...prev, verifications: [], verificationsLoading: false }));
          }
        } else if (response.status === 404) {
          console.warn('[DeviceDataContext] Verifications endpoint not found (404)');
          setState((prev) => ({ ...prev, verifications: [], verificationsLoading: false }));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('[DeviceDataContext] Error fetching verifications:', error);
        setState((prev) => ({
          ...prev,
          verificationsLoading: false,
          verificationsError: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [state.currentHost, state.currentDeviceId, state.isControlActive, hostId],
  );

  const fetchAllData = useCallback(
    async (force: boolean = false) => {
      console.log('[DeviceDataContext] Fetching all data (force:', force, ')');
      await Promise.all([
        fetchReferences(force),
        fetchAvailableActions(force),
        fetchAvailableVerifications(force),
        fetchActions(force),
        fetchVerifications(force),
      ]);
    },
    [
      fetchReferences,
      fetchAvailableActions,
      fetchAvailableVerifications,
      fetchActions,
      fetchVerifications,
    ],
  );

  // ========================================
  // DATA ACCESS HELPERS
  // ========================================

  const getModelReferences = useCallback(
    (model: string): ModelReferences => {
      if (!model || !state.references[model]) {
        const availableModels = Object.keys(state.references);
        console.log(
          `[DeviceDataContext] No references for model '${model}' (available: ${availableModels.join(', ') || 'none'})`,
        );
        return {};
      }
      return state.references[model];
    },
    [state.references],
  );

  const getAvailableActions = useCallback((): Actions => {
    return state.availableActions;
  }, [state.availableActions]);

  const getActions = useCallback((): any[] => {
    return state.actions;
  }, [state.actions]);

  const getAvailableVerificationTypes = useCallback((): Record<string, any> => {
    return state.availableVerificationTypes;
  }, [state.availableVerificationTypes]);

  const getVerifications = useCallback((): any[] => {
    return state.verifications;
  }, [state.verifications]);

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const setControlState = useCallback(
    (host: Host | null, deviceId: string | null, isActive: boolean) => {
      console.log(
        `[DeviceDataContext] Control state changed: host=${host?.host_name}, device=${deviceId}, active=${isActive}`,
      );

      const newHostId = host ? `${host.host_name}_${host.host_url}` : null;
      const hostChanged = newHostId !== loadedDataRef.current.hostId;

      if (hostChanged) {
        console.log(
          `[DeviceDataContext] Host changed from ${loadedDataRef.current.hostId} to ${newHostId}, clearing cache`,
        );
        // Reset loaded state for new host
        loadedDataRef.current = {
          hostId: newHostId,
          referencesLoaded: false,
          availableActionsLoaded: false,
          availableVerificationTypesLoaded: false,
          actionsLoaded: false,
          verificationsLoaded: false,
        };

        // Clear existing data
        setState((prev) => ({
          ...prev,
          currentHost: host,
          currentDeviceId: deviceId,
          isControlActive: isActive,
          references: {},
          availableActions: {},
          actions: [],
          availableVerificationTypes: {},
          verifications: [],
          referencesError: null,
          availableActionsError: null,
          actionsError: null,
          availableVerificationTypesError: null,
          verificationsError: null,
        }));
      } else {
        // Same host, just update control state
        setState((prev) => ({
          ...prev,
          currentHost: host,
          currentDeviceId: deviceId,
          isControlActive: isActive,
        }));
      }
    },
    [],
  );

  const clearData = useCallback(() => {
    console.log('[DeviceDataContext] Clearing all data');
    setState((prev) => ({
      ...prev,
      references: {},
      availableActions: {},
      actions: [],
      availableVerificationTypes: {},
      verifications: [],
      referencesError: null,
      availableActionsError: null,
      actionsError: null,
      availableVerificationTypesError: null,
      verificationsError: null,
    }));

    loadedDataRef.current = {
      hostId: null,
      referencesLoaded: false,
      availableActionsLoaded: false,
      availableVerificationTypesLoaded: false,
      actionsLoaded: false,
      verificationsLoaded: false,
    };
  }, []);

  const reloadData = useCallback(async () => {
    console.log('[DeviceDataContext] Manual reload triggered');
    await fetchAllData(true);
  }, [fetchAllData]);

  // ========================================
  // EFFECTS
  // ========================================

  // Auto-fetch data when control becomes active
  useEffect(() => {
    if (state.isControlActive && state.currentHost) {
      console.log(
        `[DeviceDataContext] Control active, auto-fetching data for: ${state.currentHost.host_name}`,
      );
      fetchAllData(false); // Don't force, use cache if available
    }
  }, [state.isControlActive, state.currentHost, fetchAllData]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: DeviceDataContextType = useMemo(
    () => ({
      // State
      ...state,

      // Actions
      fetchReferences,
      fetchAvailableActions,
      fetchAvailableVerifications,
      fetchActions,
      fetchVerifications,
      fetchAllData,
      getModelReferences,
      getAvailableActions,
      getActions,
      getAvailableVerificationTypes,
      getVerifications,
      setControlState,
      clearData,
      reloadData,
    }),
    [
      state,
      fetchReferences,
      fetchAvailableActions,
      fetchAvailableVerifications,
      fetchActions,
      fetchVerifications,
      fetchAllData,
      getModelReferences,
      getAvailableActions,
      getActions,
      getAvailableVerificationTypes,
      getVerifications,
      setControlState,
      clearData,
      reloadData,
    ],
  );

  return <DeviceDataContext.Provider value={contextValue}>{children}</DeviceDataContext.Provider>;
};
