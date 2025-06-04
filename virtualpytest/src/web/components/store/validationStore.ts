import { create } from 'zustand';
import { ValidationState, ValidationResults, ValidationPreview } from '../types/validationTypes';

interface ValidationStore extends ValidationState {
  setShowPreview: (show: boolean) => void;
  setShowResults: (show: boolean) => void;
  setPreviewData: (data: ValidationPreview | null) => void;
  setResults: (results: ValidationResults | null) => void;
  setValidating: (validating: boolean) => void;
  reset: () => void;
}

export const useValidationStore = create<ValidationStore>((set) => ({
  isValidating: false,
  showPreview: false,
  showResults: false,
  previewData: null,
  results: null,
  
  setShowPreview: (show) => {
    console.log(`[@store:validationStore] Setting showPreview: ${show}`);
    set({ showPreview: show });
  },
  
  setShowResults: (show) => {
    console.log(`[@store:validationStore] Setting showResults: ${show}`);
    set({ showResults: show });
  },
  
  setPreviewData: (data) => {
    console.log(`[@store:validationStore] Setting preview data:`, data ? `${data.totalNodes} nodes` : 'null');
    set({ previewData: data });
  },
  
  setResults: (results) => {
    console.log(`[@store:validationStore] Setting results:`, results ? `${results.summary.totalNodes} nodes, ${results.summary.overallHealth} health` : 'null');
    set({ results });
  },
  
  setValidating: (validating) => {
    console.log(`[@store:validationStore] Setting validating: ${validating}`);
    set({ isValidating: validating });
  },
  
  reset: () => {
    console.log(`[@store:validationStore] Resetting validation store`);
    set({
      isValidating: false,
      showPreview: false,
      showResults: false,
      previewData: null,
      results: null,
    });
  },
})); 