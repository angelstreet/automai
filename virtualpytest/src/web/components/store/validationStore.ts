import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ValidationState, ValidationResults, ValidationPreview, ValidationProgress } from '../../types/features/Validation_Types';
import { ValidationStatus } from '../../config/validationColors';

interface ValidationStatusData {
  status: ValidationStatus;
  confidence?: number;
  lastTested?: Date;
}

interface ValidationStore extends ValidationState {
  lastResult: ValidationResults | null;
  nodeValidationStatus: Map<string, { status: ValidationStatus; confidence: number; lastTested: Date }>;
  edgeValidationStatus: Map<string, { status: ValidationStatus; confidence: number; lastTested: Date }>;
  currentTestingNode: string | null;
  currentTestingEdge: string | null;
  setShowPreview: (show: boolean) => void;
  setShowResults: (show: boolean) => void;
  setShowProgress: (show: boolean) => void;
  setPreviewData: (data: ValidationPreview | null) => void;
  setResults: (results: ValidationResults | null) => void;
  setLastResult: (results: ValidationResults | null) => void;
  setProgress: (progress: ValidationProgress | null) => void;
  setValidating: (validating: boolean) => void;
  setNodeValidationStatus: (nodeId: string, status: ValidationStatusData) => void;
  setEdgeValidationStatus: (edgeId: string, status: ValidationStatusData) => void;
  setCurrentTestingNode: (nodeId: string | null) => void;
  setCurrentTestingEdge: (edgeId: string | null) => void;
  resetValidationColors: () => void;
  reset: () => void;
  showLastResult: () => void;
  isValidating: boolean;
  showPreview: boolean;
  showResults: boolean;
  showProgress: boolean;
  previewData: ValidationPreview | null;
  results: ValidationResults | null;
  progress: ValidationProgress | null;
}

// Helper functions to serialize/deserialize Maps for localStorage
const serializeValidationStatus = (map: Map<string, ValidationStatusData>) => {
  return Array.from(map.entries()).map(([key, value]) => [
    key,
    {
      ...value,
      lastTested: value.lastTested?.toISOString()
    }
  ]);
};

const deserializeValidationStatus = (data: any[]): Map<string, ValidationStatusData> => {
  const map = new Map();
  if (Array.isArray(data)) {
    data.forEach(([key, value]) => {
      map.set(key, {
        ...value,
        lastTested: value.lastTested ? new Date(value.lastTested) : undefined
      });
    });
  }
  return map;
};

export const useValidationStore = create<ValidationStore>()(
  persist(
    (set, get) => ({
      isValidating: false,
      showPreview: false,
      showResults: false,
      showProgress: false,
      previewData: null,
      results: null,
      lastResult: null,
      progress: null,
      nodeValidationStatus: new Map(),
      edgeValidationStatus: new Map(),
      currentTestingNode: null,
      currentTestingEdge: null,
      
      setShowPreview: (show) => {
        console.log(`[@store:validationStore] Setting showPreview: ${show}`);
        set({ showPreview: show });
      },
      
      setShowResults: (show) => {
        console.log(`[@store:validationStore] Setting showResults: ${show}`);
        set({ showResults: show });
      },
      
      setShowProgress: (show) => {
        console.log(`[@store:validationStore] Setting showProgress: ${show}`);
        set({ showProgress: show });
      },
      
      setPreviewData: (data) => {
        console.log(`[@store:validationStore] Setting preview data:`, data ? `${data.totalNodes} nodes` : 'null');
        set({ previewData: data });
      },
      
      setResults: (results) => {
        console.log(`[@store:validationStore] Setting results:`, results ? `${results.summary.totalNodes} nodes, ${results.summary.overallHealth} health` : 'null');
        set({ results });
        
        if (results) {
          console.log(`[@store:validationStore] Caching result for later viewing`);
          set({ lastResult: results });
        }
      },
      
      setLastResult: (results) => {
        console.log(`[@store:validationStore] Setting lastResult:`, results ? `${results.summary.totalNodes} nodes, ${results.summary.overallHealth} health` : 'null');
        set({ lastResult: results });
      },
      
      setProgress: (progress) => {
        console.log(`[@store:validationStore] Setting progress:`, progress ? `step ${progress.currentStep}/${progress.totalSteps}, node: ${progress.currentNodeName}` : 'null');
        set({ progress });
        
        // Update current testing node/edge based on progress
        if (progress) {
          set({ 
            currentTestingNode: progress.currentEdgeTo,
            currentTestingEdge: progress.currentEdgeFrom && progress.currentEdgeTo 
              ? `${progress.currentEdgeFrom}-${progress.currentEdgeTo}` 
              : null
          });
        }
      },
      
      setValidating: (validating) => {
        console.log(`[@store:validationStore] Setting validating: ${validating}`);
        set({ isValidating: validating });
        
        // Reset testing indicators when validation stops
        if (!validating) {
          set({ 
            currentTestingNode: null,
            currentTestingEdge: null 
          });
        }
      },
      
      setNodeValidationStatus: (nodeId, status) => {
        console.log(`[@store:validationStore] Setting node validation status for ${nodeId}:`, status.status);
        const { nodeValidationStatus } = get();
        const newMap = new Map(nodeValidationStatus);
        newMap.set(nodeId, status);
        set({ nodeValidationStatus: newMap });
      },
      
      setEdgeValidationStatus: (edgeId, status) => {
        console.log(`[@store:validationStore] Setting edge validation status for ${edgeId}:`, status.status);
        const { edgeValidationStatus } = get();
        const newMap = new Map(edgeValidationStatus);
        newMap.set(edgeId, status);
        set({ edgeValidationStatus: newMap });
      },
      
      setCurrentTestingNode: (nodeId) => {
        console.log(`[@store:validationStore] Setting current testing node: ${nodeId}`);
        set({ currentTestingNode: nodeId });
      },
      
      setCurrentTestingEdge: (edgeId) => {
        console.log(`[@store:validationStore] Setting current testing edge: ${edgeId}`);
        set({ currentTestingEdge: edgeId });
      },
      
      resetValidationColors: () => {
        console.log(`[@store:validationStore] Resetting validation colors`);
        set({ 
          nodeValidationStatus: new Map(),
          edgeValidationStatus: new Map(),
          currentTestingNode: null,
          currentTestingEdge: null
        });
      },
      
      showLastResult: () => {
        const { lastResult } = get();
        if (lastResult) {
          console.log(`[@store:validationStore] Showing cached result`);
          set({ 
            results: lastResult,
            showResults: true 
          });
        } else {
          console.log(`[@store:validationStore] No cached result available`);
        }
      },
      
      reset: () => {
        console.log(`[@store:validationStore] Resetting validation store`);
        set({
          isValidating: false,
          showPreview: false,
          showResults: false,
          showProgress: false,
          previewData: null,
          results: null,
          progress: null,
          nodeValidationStatus: new Map(),
          edgeValidationStatus: new Map(),
          currentTestingNode: null,
          currentTestingEdge: null,
        });
      },
    }),
    {
      name: 'validation-store',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          
          // Deserialize Maps
          if (parsed.state.nodeValidationStatus) {
            parsed.state.nodeValidationStatus = deserializeValidationStatus(parsed.state.nodeValidationStatus);
          }
          if (parsed.state.edgeValidationStatus) {
            parsed.state.edgeValidationStatus = deserializeValidationStatus(parsed.state.edgeValidationStatus);
          }
          
          return parsed;
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              // Serialize Maps
              nodeValidationStatus: serializeValidationStatus(value.state.nodeValidationStatus),
              edgeValidationStatus: serializeValidationStatus(value.state.edgeValidationStatus),
              // Don't persist transient state
              isValidating: false,
              showPreview: false,
              showResults: false,
              showProgress: false,
              previewData: null,
              results: null,
              progress: null,
              currentTestingNode: null,
              currentTestingEdge: null,
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
); 