import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';

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
  
  // Actions data
  actions: Actions;
  actionsLoading: boolean;
  actionsError: string | null;
  
  // Verification types data
  verificationTypes: Record<string, any>;
  verificationTypesLoading: boolean;
  verificationTypesError: string | null;
  
  // Host tracking
  currentHost: Host | null;
  currentDeviceId: string | null;
  isControlActive: boolean;
}

interface DeviceDataActions {
  // Data fetching
  fetchReferences: (force?: boolean) => Promise<void>;
  fetchActions: (force?: boolean) => Promise<void>;
  fetchVerificationTypes: (force?: boolean) => Promise<void>;
  fetchAllData: (force?: boolean) => Promise<void>;
  
  // Data access helpers
  getModelReferences: (model?: string) => ModelReferences;
  getModelActions: (model?: string) => Actions;
  getVerificationTypes: (deviceId?: string) => Record<string, any>;
  
  // State management
  setControlState: (host: Host | null, deviceId: string | null, isActive: boolean) => void;
  clearData: () => void;
  reloadData: () => Promise<void>;
}

type DeviceDataContextType = DeviceDataState & DeviceDataActions;

// ========================================
// CONTEXT
// ========================================

const DeviceDataContext = createContext<DeviceDataContextType | null>(null);

export const useDeviceData = (): DeviceDataContextType => {
  const context = useContext(DeviceDataContext);
  if (!context) {
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
    actions: {},
    actionsLoading: false,
    actionsError: null,
    verificationTypes: {},
    verificationTypesLoading: false,
    verificationTypesError: null,
    currentHost: null,
    currentDeviceId: null,
    isControlActive: false,
  });

  // Track what's been loaded to prevent duplicate fetches
  const loadedDataRef = useRef<{
    hostId: string | null;
    referencesLoaded: boolean;
    actionsLoaded: boolean;
    verificationTypesLoaded: boolean;
  }>({
    hostId: null,
    referencesLoaded: false,
    actionsLoaded: false,
    verificationTypesLoaded: false,
  });

  // Create stable host identifier
  const hostId = useMemo(() => {
    return state.currentHost ? `${state.currentHost.host_name}_${state.currentHost.host_url}` : null;
  }, [state.currentHost]);

  // ========================================
  // DATA FETCHING FUNCTIONS
  // ========================================

  const fetchReferences = useCallback(async (force: boolean = false) => {
    if (!state.isControlActive || !state.currentHost) {
      console.log('[DeviceDataContext] Cannot fetch references - control not active or no host');
      return;
    }

    // Check if already loaded (unless forced)
    if (!force && loadedDataRef.current.hostId === hostId && loadedDataRef.current.referencesLoaded) {
      console.log('[DeviceDataContext] References already loaded for host:', hostId);
      return;
    }

    setState(prev => ({ ...prev, referencesLoading: true, referencesError: null }));

    try {
      console.log(`[DeviceDataContext] Fetching references for host: ${state.currentHost.host_name}`);

      const response = await fetch('/server/verification/getAllReferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: state.currentHost }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.images && Array.isArray(result.images)) {
          const deviceModel = result.device_model || result.model || 'unknown';
          const modelRefs: ModelReferences = {};

          result.images.forEach((ref: any) => {
            const baseName = ref.name || ref.filename || 'unknown';
            const refType = ref.type === 'reference_text' ? 'text' : 'image';
            
            let filename = baseName;
            if (refType === 'image' && modelRefs[baseName]) {
              filename = `${baseName}_image`;
            }

            modelRefs[filename] = {
              type: refType,
              url: ref.r2_url || ref.url,
              area: ref.area || { x: 0, y: 0, width: 0, height: 0 },
              created_at: ref.created_at,
              updated_at: ref.updated_at,
              ...(refType === 'text' && ref.area && {
                text: ref.area.text,
                font_size: ref.area.font_size,
                confidence: ref.area.confidence,
              }),
            };
          });

          const references = { [deviceModel]: modelRefs };
          const imageCount = Object.values(modelRefs).filter(ref => ref.type === 'image').length;
          const textCount = Object.values(modelRefs).filter(ref => ref.type === 'text').length;

          console.log(`[DeviceDataContext] ✅ Loaded ${Object.keys(modelRefs).length} references for '${deviceModel}': ${imageCount} images, ${textCount} text`);

          setState(prev => ({ ...prev, references, referencesLoading: false }));
          loadedDataRef.current.referencesLoaded = true;
        } else {
          setState(prev => ({ ...prev, references: {}, referencesLoading: false }));
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[DeviceDataContext] Error fetching references:', error);
      setState(prev => ({ 
        ...prev, 
        referencesLoading: false, 
        referencesError: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [state.currentHost, state.isControlActive, hostId]);

  const fetchActions = useCallback(async (force: boolean = false) => {
    if (!state.isControlActive || !state.currentHost) {
      console.log('[DeviceDataContext] Cannot fetch actions - control not active or no host');
      return;
    }

    // Check if already loaded (unless forced)
    if (!force && loadedDataRef.current.hostId === hostId && loadedDataRef.current.actionsLoaded) {
      console.log('[DeviceDataContext] Actions already loaded for host:', hostId);
      return;
    }

    setState(prev => ({ ...prev, actionsLoading: true, actionsError: null }));

    try {
      console.log(`[DeviceDataContext] Fetching actions for host: ${state.currentHost.host_name}`);

      const response = await fetch('/server/system/getAvailableActions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: state.currentHost }),
      });

      if (response.ok) {
        const result = await response.json();
        
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

          console.log(`[DeviceDataContext] ✅ Loaded ${totalActions} actions in ${categories} categories`);

          setState(prev => ({ ...prev, actions: categorizedActions, actionsLoading: false }));
          loadedDataRef.current.actionsLoaded = true;
        } else {
          setState(prev => ({ ...prev, actions: {}, actionsLoading: false }));
        }
      } else if (response.status === 404) {
        console.warn('[DeviceDataContext] Actions endpoint not found (404)');
        setState(prev => ({ ...prev, actions: {}, actionsLoading: false }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[DeviceDataContext] Error fetching actions:', error);
      setState(prev => ({ 
        ...prev, 
        actionsLoading: false, 
        actionsError: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [state.currentHost, state.isControlActive, hostId]);

  const fetchVerificationTypes = useCallback(async (force: boolean = false) => {
    if (!state.currentHost || !state.currentDeviceId) {
      console.log('[DeviceDataContext] Cannot fetch verification types - no host or device');
      return;
    }

    // Check if already loaded (unless forced)
    if (!force && loadedDataRef.current.hostId === hostId && loadedDataRef.current.verificationTypesLoaded) {
      console.log('[DeviceDataContext] Verification types already loaded for host:', hostId);
      return;
    }

    setState(prev => ({ ...prev, verificationTypesLoading: true, verificationTypesError: null }));

    try {
      const device = state.currentHost.devices?.find(d => d.device_id === state.currentDeviceId);
      const deviceVerificationTypes = device?.device_verification_types;

      if (deviceVerificationTypes) {
        console.log('[DeviceDataContext] Loading verification types from device:', deviceVerificationTypes);

        const transformedTypes: Record<string, any> = {};

        Object.entries(deviceVerificationTypes).forEach(([verType, verConfig]: [string, any]) => {
          if (!Array.isArray(verConfig)) {
            console.error(`[DeviceDataContext] Expected array for ${verType}, got:`, typeof verConfig);
            return;
          }

          transformedTypes[verType] = verConfig.map((verification: any) => {
            const transformed = {
              command: verification.command || verification.type,
              verification_type: verType,
              params: {} as Record<string, any>,
            };

            if (verification.params && typeof verification.params === 'object') {
              transformed.params = verification.params;
            } else if (verification.parameters && Array.isArray(verification.parameters)) {
              verification.parameters.forEach((paramName: string) => {
                transformed.params[paramName] = '';
              });
            }

            return transformed;
          });
        });

        console.log('[DeviceDataContext] ✅ Loaded verification types:', transformedTypes);
        setState(prev => ({ ...prev, verificationTypes: transformedTypes, verificationTypesLoading: false }));
        loadedDataRef.current.verificationTypesLoaded = true;
      } else {
        setState(prev => ({ ...prev, verificationTypes: {}, verificationTypesLoading: false }));
      }
    } catch (error) {
      console.error('[DeviceDataContext] Error loading verification types:', error);
      setState(prev => ({ 
        ...prev, 
        verificationTypesLoading: false, 
        verificationTypesError: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [state.currentHost, state.currentDeviceId, hostId]);

  const fetchAllData = useCallback(async (force: boolean = false) => {
    console.log('[DeviceDataContext] Fetching all data (force:', force, ')');
    await Promise.all([
      fetchReferences(force),
      fetchActions(force),
      fetchVerificationTypes(force),
    ]);
  }, [fetchReferences, fetchActions, fetchVerificationTypes]);

  // ========================================
  // DATA ACCESS HELPERS
  // ========================================

  const getModelReferences = useCallback((model?: string): ModelReferences => {
    if (!model || !state.references[model]) {
      const availableModels = Object.keys(state.references);
      console.log(`[DeviceDataContext] No references for model '${model}' (available: ${availableModels.join(', ') || 'none'})`);
      return {};
    }
    return state.references[model];
  }, [state.references]);

  const getModelActions = useCallback((_model?: string): Actions => {
    return state.actions;
  }, [state.actions]);

  const getVerificationTypes = useCallback((deviceId?: string): Record<string, any> => {
    if (deviceId && deviceId !== state.currentDeviceId) {
      console.log(`[DeviceDataContext] Verification types requested for different device: ${deviceId} vs ${state.currentDeviceId}`);
    }
    return state.verificationTypes;
  }, [state.verificationTypes, state.currentDeviceId]);

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const setControlState = useCallback((host: Host | null, deviceId: string | null, isActive: boolean) => {
    console.log(`[DeviceDataContext] Control state changed: host=${host?.host_name}, device=${deviceId}, active=${isActive}`);
    
    const newHostId = host ? `${host.host_name}_${host.host_url}` : null;
    const hostChanged = newHostId !== loadedDataRef.current.hostId;
    
    if (hostChanged) {
      console.log(`[DeviceDataContext] Host changed from ${loadedDataRef.current.hostId} to ${newHostId}, clearing cache`);
      // Reset loaded state for new host
      loadedDataRef.current = {
        hostId: newHostId,
        referencesLoaded: false,
        actionsLoaded: false,
        verificationTypesLoaded: false,
      };
      
      // Clear existing data
      setState(prev => ({
        ...prev,
        currentHost: host,
        currentDeviceId: deviceId,
        isControlActive: isActive,
        references: {},
        actions: {},
        verificationTypes: {},
        referencesError: null,
        actionsError: null,
        verificationTypesError: null,
      }));
    } else {
      // Same host, just update control state
      setState(prev => ({
        ...prev,
        currentHost: host,
        currentDeviceId: deviceId,
        isControlActive: isActive,
      }));
    }
  }, []);

  const clearData = useCallback(() => {
    console.log('[DeviceDataContext] Clearing all data');
    setState(prev => ({
      ...prev,
      references: {},
      actions: {},
      verificationTypes: {},
      referencesError: null,
      actionsError: null,
      verificationTypesError: null,
    }));
    
    loadedDataRef.current = {
      hostId: null,
      referencesLoaded: false,
      actionsLoaded: false,
      verificationTypesLoaded: false,
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
      console.log(`[DeviceDataContext] Control active, auto-fetching data for: ${state.currentHost.host_name}`);
      fetchAllData(false); // Don't force, use cache if available
    }
  }, [state.isControlActive, state.currentHost, fetchAllData]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: DeviceDataContextType = useMemo(() => ({
    // State
    ...state,
    
    // Actions
    fetchReferences,
    fetchActions,
    fetchVerificationTypes,
    fetchAllData,
    getModelReferences,
    getModelActions,
    getVerificationTypes,
    setControlState,
    clearData,
    reloadData,
  }), [
    state,
    fetchReferences,
    fetchActions,
    fetchVerificationTypes,
    fetchAllData,
    getModelReferences,
    getModelActions,
    getVerificationTypes,
    setControlState,
    clearData,
    reloadData,
  ]);

  return (
    <DeviceDataContext.Provider value={contextValue}>
      {children}
    </DeviceDataContext.Provider>
  );
}; 