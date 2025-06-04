import { create } from 'zustand';
import { ValidationState, ValidationResults, ValidationPreview, ValidationProgress } from '../types/validationTypes';

interface ValidationStore extends ValidationState {
  lastResult: ValidationResults | null;
  setShowPreview: (show: boolean) => void;
  setShowResults: (show: boolean) => void;
  setShowProgress: (show: boolean) => void;
  setPreviewData: (data: ValidationPreview | null) => void;
  setResults: (results: ValidationResults | null) => void;
  setLastResult: (results: ValidationResults | null) => void;
  setProgress: (progress: ValidationProgress | null) => void;
  setValidating: (validating: boolean) => void;
  reset: () => void;
  showLastResult: () => void;
}

export const useValidationStore = create<ValidationStore>((set, get) => ({
  isValidating: false,
  showPreview: false,
  showResults: false,
  showProgress: false,
  previewData: null,
  results: null,
  lastResult: null,
  progress: null,
  
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
  },
  
  setValidating: (validating) => {
    console.log(`[@store:validationStore] Setting validating: ${validating}`);
    set({ isValidating: validating });
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
    });
  },
})); 