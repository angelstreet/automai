import { useState } from 'react';

import { buildServerUrl } from '../../utils/frontendUtils';

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
    imageFilter: 'none',
  });

  const openImageComparisonModal = (data: Partial<ImageComparisonDialogData>) => {
    setImageComparisonDialog({
      open: true,
      sourceUrl: data.sourceUrl ? buildServerUrl(data.sourceUrl) : '',
      referenceUrl: data.referenceUrl ? buildServerUrl(data.referenceUrl) : '',
      userThreshold: data.userThreshold,
      matchingResult: data.matchingResult,
      resultType: data.resultType,
      imageFilter: data.imageFilter || 'none',
    });
  };

  const closeImageComparisonModal = () => {
    setImageComparisonDialog((prev) => ({
      ...prev,
      open: false,
    }));
  };

  return {
    imageComparisonDialog,
    openImageComparisonModal,
    closeImageComparisonModal,
  };
};
