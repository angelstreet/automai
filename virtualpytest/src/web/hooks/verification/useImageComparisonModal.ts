import { useState } from 'react';

interface ImageComparisonDialogData {
  open: boolean;
  sourceUrl: string;
  referenceUrl: string;
  userThreshold?: number;
  matchingResult?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  imageFilter?: 'none' | 'greyscale' | 'binary';
}

interface UseImageComparisonModalReturn {
  imageComparisonDialog: ImageComparisonDialogData;
  openImageComparisonModal: (data: Partial<ImageComparisonDialogData>) => void;
  closeImageComparisonModal: () => void;
}

export const useImageComparisonModal = (): UseImageComparisonModalReturn => {
  const [imageComparisonDialog, setImageComparisonDialog] = useState<ImageComparisonDialogData>({
    open: false,
    sourceUrl: '',
    referenceUrl: '',
    userThreshold: undefined,
    matchingResult: undefined,
    resultType: undefined,
    imageFilter: undefined
  });

  const openImageComparisonModal = (data: Partial<ImageComparisonDialogData>) => {
    setImageComparisonDialog({
      open: true,
      sourceUrl: data.sourceUrl ? `http://localhost:5009${data.sourceUrl}` : '',
      referenceUrl: data.referenceUrl ? `http://localhost:5009${data.referenceUrl}` : '',
      userThreshold: data.userThreshold,
      matchingResult: data.matchingResult,
      resultType: data.resultType,
      imageFilter: data.imageFilter
    });
  };

  const closeImageComparisonModal = () => {
    setImageComparisonDialog(prev => ({ ...prev, open: false }));
  };

  return {
    imageComparisonDialog,
    openImageComparisonModal,
    closeImageComparisonModal
  };
}; 