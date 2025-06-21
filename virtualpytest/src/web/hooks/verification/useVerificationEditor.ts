import { useState, useCallback } from 'react';

import { Host } from '../../types/common/Host_Types';

import { useVerification } from './useVerification';
import { useVerificationReferences } from './useVerificationReferences';

// Define interfaces for editor-specific data structures
interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DetectedTextData {
  text: string;
  fontSize: number;
  confidence: number;
  detectedLanguage?: string;
  detectedLanguageName?: string;
  languageConfidence?: number;
}

interface ImageProcessingOptions {
  autocrop: boolean;
  removeBackground: boolean;
}

interface SelectedReferenceInfo {
  name: string;
  type: 'image' | 'text';
}

interface UseVerificationEditorProps {
  isVisible: boolean;
  selectedHost: Host;
  captureSourcePath?: string;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  isCaptureActive?: boolean;
}

export const useVerificationEditor = ({
  isVisible: _isVisible,
  selectedHost,
  captureSourcePath,
  selectedArea,
  onAreaSelected: _onAreaSelected,
  onClearSelection: _onClearSelection,
  isCaptureActive,
}: UseVerificationEditorProps) => {
  // Use the pure verification hook for core functionality
  const verification = useVerification({
    selectedHost,
    captureSourcePath,
  });

  // State for reference capture
  const [referenceName, setReferenceName] = useState<string>('default_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [referenceSaveCounter, setReferenceSaveCounter] = useState<number>(0);

  // Add references management after referenceSaveCounter is declared
  const { availableReferences, referencesLoading, fetchAvailableReferences, getModelReferences } =
    useVerificationReferences(referenceSaveCounter, selectedHost);

  // State for reference type and details
  const [referenceText, setReferenceText] = useState<string>('');
  const [referenceType, setReferenceType] = useState<'image' | 'text'>('image');
  const [detectedTextData, setDetectedTextData] = useState<DetectedTextData | null>(null);
  const [textImageFilter, setTextImageFilter] = useState<'none' | 'greyscale' | 'binary'>('none');

  // State for selected reference image preview
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [selectedReferenceInfo, setSelectedReferenceInfo] = useState<SelectedReferenceInfo | null>(
    null,
  );

  // Image processing options for capture only
  const [imageProcessingOptions, setImageProcessingOptions] = useState<ImageProcessingOptions>({
    autocrop: false,
    removeBackground: false,
  });

  // Collapsible sections state
  const [verificationsCollapsed, setVerificationsCollapsed] = useState<boolean>(false);
  const [captureCollapsed, setCaptureCollapsed] = useState<boolean>(false);

  // Handle reference selection
  const handleReferenceSelected = useCallback(async (referenceName: string, referenceData: any) => {
    console.log('[@hook:useVerificationEditor] Reference selected:', referenceName, referenceData);

    // If it's an image reference, display it in the preview area
    if (referenceData && referenceData.type === 'image') {
      // Use the complete URL directly from reference data
      const referenceUrl = referenceData.url;

      console.log('[@hook:useVerificationEditor] Setting reference image preview:', {
        referenceName,
        referenceUrl,
        referenceData,
      });

      setSelectedReferenceImage(referenceUrl);
      setSelectedReferenceInfo({
        name: referenceName,
        type: 'image',
      });
    } else if (referenceData && referenceData.type === 'text') {
      // For text references, clear the image preview
      console.log('[@hook:useVerificationEditor] Text reference selected, clearing image preview');
      setSelectedReferenceImage(null);
      setSelectedReferenceInfo({
        name: referenceName,
        type: 'text',
      });
    } else {
      // Clear preview for unknown or null references
      setSelectedReferenceImage(null);
      setSelectedReferenceInfo(null);
    }

    // Clear captured reference when selecting a new reference
    setCapturedReferenceImage(null);
    setHasCaptured(false);
  }, []);

  // Handle capture reference
  const handleCaptureReference = useCallback(async () => {
    if (!selectedArea || !captureSourcePath) {
      verification.setSuccessMessage(null);
      // Use verification's error state through a custom handler if needed
      console.error('[@hook:useVerificationEditor] Please select an area on the screenshot first');
      return;
    }

    console.log('[@hook:useVerificationEditor] Capture reference requested:', {
      selectedArea,
      captureSourcePath,
      referenceName,
      referenceType,
      imageProcessingOptions,
    });

    try {
      let captureResponse;

      if (
        referenceType === 'image' &&
        (imageProcessingOptions.autocrop || imageProcessingOptions.removeBackground)
      ) {
        console.log(
          '[@hook:useVerificationEditor] Using process-image endpoint with processing options',
        );
        captureResponse = await fetch(`/server/verification/image/process-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            area: selectedArea,
            source_path: captureSourcePath,
            reference_name: referenceName || 'temp_capture',
            model: selectedHost.device_model,
            autocrop: imageProcessingOptions.autocrop,
            remove_background: imageProcessingOptions.removeBackground,
          }),
        });
      } else {
        console.log('[@hook:useVerificationEditor] Using standard crop-image endpoint');
        captureResponse = await fetch(`/server/verification/image/crop-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            area: selectedArea,
            source_path: captureSourcePath,
            reference_name: referenceName || 'temp_capture',
            model: selectedHost.device_model,
          }),
        });
      }

      const result = await captureResponse.json();
      console.log('[@hook:useVerificationEditor] Capture response result:', result);

      if (result.success) {
        const timestamp = new Date().getTime();
        const imageUrl = `${result.image_url}?t=${timestamp}`;
        console.log(
          '[@hook:useVerificationEditor] Temporary capture created successfully, setting image URL:',
          imageUrl,
        );

        setCapturedReferenceImage(imageUrl);
        setHasCaptured(true);

        // If autocrop was applied and new area dimensions are provided, update the selected area
        if (imageProcessingOptions.autocrop && result.processed_area) {
          console.log('[@hook:useVerificationEditor] === AUTOCROP AREA UPDATE ===');
          console.log('[@hook:useVerificationEditor] Original area:', selectedArea);
          console.log(
            '[@hook:useVerificationEditor] Processed area from server:',
            result.processed_area,
          );

          // Update selected area if onAreaSelected callback is available
          if (_onAreaSelected) {
            _onAreaSelected({
              x: result.processed_area.x,
              y: result.processed_area.y,
              width: result.processed_area.width,
              height: result.processed_area.height,
            });
          }
          console.log('[@hook:useVerificationEditor] Area updated after autocrop');
        }
      } else {
        console.error('[@hook:useVerificationEditor] Failed to capture reference:', result.error);
        // Handle error through verification hook if needed
      }
    } catch (error) {
      console.error('[@hook:useVerificationEditor] Error capturing reference:', error);
      // Handle error through verification hook if needed
    }
  }, [
    selectedArea,
    captureSourcePath,
    referenceName,
    selectedHost,
    referenceType,
    imageProcessingOptions,
    _onAreaSelected,
    verification,
  ]);

  // Handle save reference
  const handleSaveReference = useCallback(async () => {
    if (!selectedArea || !captureSourcePath) {
      console.error('[@hook:useVerificationEditor] Please select an area on the screenshot first');
      return;
    }

    if (!referenceName.trim()) {
      console.error('[@hook:useVerificationEditor] Please enter a reference name');
      return;
    }

    setPendingSave(true);

    try {
      console.log('[@hook:useVerificationEditor] Saving reference with data:', {
        name: referenceName,
        model: selectedHost.device_model,
        area: selectedArea,
        captureSourcePath: captureSourcePath,
        referenceType: referenceType,
        imageProcessingOptions: imageProcessingOptions,
      });

      // Step 1: Capture the area (with processing if needed)
      let captureResponse;

      if (
        referenceType === 'image' &&
        (imageProcessingOptions.autocrop || imageProcessingOptions.removeBackground)
      ) {
        console.log('[@hook:useVerificationEditor] Capturing with processing options for save');
        captureResponse = await fetch(`/server/verification/image/process-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            area: selectedArea,
            source_path: captureSourcePath,
            reference_name: referenceName,
            model: selectedHost.device_model,
            autocrop: imageProcessingOptions.autocrop,
            remove_background: imageProcessingOptions.removeBackground,
          }),
        });
      } else {
        console.log('[@hook:useVerificationEditor] Capturing without processing for save');
        captureResponse = await fetch(`/server/verification/image/crop-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            area: selectedArea,
            source_path: captureSourcePath,
            reference_name: referenceName,
            model: selectedHost.device_model,
          }),
        });
      }

      const captureResult = await captureResponse.json();

      if (!captureResult.success) {
        throw new Error(captureResult.error || 'Failed to capture area');
      }

      // Step 2: Upload to R2 (HOST) and then save to database (SERVER)
      if (referenceType === 'text') {
        // Text references use the old single-call pattern
        const response = await fetch('/server/verification/text/save-text-reference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            name: referenceName,
            model: selectedHost.device_model,
            area:
              imageProcessingOptions.autocrop && captureResult.processed_area
                ? captureResult.processed_area
                : selectedArea,
            screenshot_path: captureSourcePath,
            referenceType: referenceType === 'text' ? 'reference_text' : 'reference_image',
            text: referenceText,
            cropped_filename: captureResult.filename,
          }),
        });

        const result = await response.json();
        if (result.success) {
          verification.setSuccessMessage(`Reference "${referenceName}" saved successfully`);
          setReferenceName('');
          setCapturedReferenceImage(null);
          setHasCaptured(false);
          setReferenceSaveCounter((prev) => prev + 1);
        } else {
          console.error(
            '[@hook:useVerificationEditor] Failed to save text reference:',
            result.error,
          );
        }
      } else {
        // Image references use new two-step pattern: HOST upload + SERVER database save

        // Step 2a: Upload to R2 via SERVER (proxy to HOST)
        const uploadResponse = await fetch('/server/verification/image/save-image-reference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            reference_name: referenceName,
            model: selectedHost.device_model,
            area:
              imageProcessingOptions.autocrop && captureResult.processed_area
                ? captureResult.processed_area
                : selectedArea,
            cropped_filename: captureResult.filename,
            reference_type: referenceType === 'image' ? 'reference_image' : 'screenshot',
          }),
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          console.error(
            '[@hook:useVerificationEditor] Failed to upload image to R2:',
            uploadResult.error,
          );
          return;
        }

        console.log('[@hook:useVerificationEditor] Image uploaded to R2:', uploadResult.r2_url);

        // Step 2b: Save metadata to database via SERVER (using exact same pattern as navigation trees)
        const dbResponse = await fetch('/server/verification/image/save-image-reference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost, // Add missing host object
            reference_name: referenceName,
            model: selectedHost.device_model,
            r2_url: uploadResult.r2_url,
            area:
              imageProcessingOptions.autocrop && captureResult.processed_area
                ? captureResult.processed_area
                : selectedArea,
            reference_type: referenceType === 'image' ? 'reference_image' : 'screenshot',
          }),
        });

        const dbResult = await dbResponse.json();

        if (dbResult.success) {
          console.log('[@hook:useVerificationEditor] Reference saved successfully:', dbResult);
          verification.setSuccessMessage(`Reference "${referenceName}" saved successfully`);
          // Don't clear UI state - keep the captured image and name for user reference
          // Only increment counter to refresh reference list
          setReferenceSaveCounter((prev) => prev + 1);
        } else {
          console.error(
            '[@hook:useVerificationEditor] Failed to save reference to database:',
            dbResult.error,
          );
        }
      }
    } catch (err: any) {
      console.error('[@hook:useVerificationEditor] Error saving reference:', err);
    } finally {
      setPendingSave(false);
    }
  }, [
    selectedArea,
    captureSourcePath,
    referenceName,
    selectedHost,
    referenceType,
    referenceText,
    imageProcessingOptions,
    verification,
  ]);

  // Handle auto-detect text
  const handleAutoDetectText = useCallback(async () => {
    if (!selectedArea || !selectedHost.device_model) {
      console.log('[@hook:useVerificationEditor] Cannot auto-detect: missing area or model');
      return;
    }

    if (!captureSourcePath) {
      console.log('[@hook:useVerificationEditor] Cannot auto-detect: missing capture source path');
      return;
    }

    try {
      console.log(
        '[@hook:useVerificationEditor] Starting text auto-detection in area:',
        selectedArea,
      );

      // Extract filename from captureSourcePath for the backend
      const sourceFilename = captureSourcePath.split('/').pop() || '';
      console.log('[@hook:useVerificationEditor] Extracted source filename:', sourceFilename);

      const response = await fetch(`/server/verification/text/auto-detect-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost, // Send full host object
          model: selectedHost.device_model,
          area: selectedArea,
          source_filename: sourceFilename,
          image_filter: textImageFilter,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[@hook:useVerificationEditor] Text auto-detection successful:', result);

        setDetectedTextData({
          text: result.detected_text || '',
          fontSize: result.font_size || 0,
          confidence: result.confidence || 0,
          detectedLanguage: result.detected_language,
          detectedLanguageName: result.detected_language_name,
          languageConfidence: result.language_confidence,
        });

        // Pre-fill the text input with detected text
        setReferenceText(result.detected_text || '');

        // Mark as captured
        setHasCaptured(true);
      } else {
        console.error('[@hook:useVerificationEditor] Text auto-detection failed:', result.error);
      }
    } catch (error) {
      console.error('[@hook:useVerificationEditor] Error during text auto-detection:', error);
    }
  }, [selectedArea, selectedHost, captureSourcePath, textImageFilter]);

  // Validate regex
  const validateRegex = useCallback((text: string): boolean => {
    if (!text) return true; // Empty text is valid

    try {
      new RegExp(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Handle confirm overwrite
  const handleConfirmOverwrite = useCallback(async () => {
    setShowConfirmDialog(false);
    await handleSaveReference();
  }, [handleSaveReference]);

  // Handle cancel overwrite
  const handleCancelOverwrite = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // Calculate if capture is possible
  const canCapture = selectedArea;

  // Calculate if save is possible
  const canSave = (() => {
    if (
      !referenceName.trim() ||
      !selectedArea ||
      !selectedHost.device_model ||
      selectedHost.device_model.trim() === ''
    ) {
      return false;
    }

    if (referenceType === 'image') {
      return hasCaptured; // Image type requires capture
    } else if (referenceType === 'text') {
      return referenceText.trim() !== '' && validateRegex(referenceText); // Text type requires valid text/regex
    }

    return false;
  })();

  // Calculate if selection is allowed
  const allowSelection = !isCaptureActive && captureSourcePath;

  // Handle type change
  const handleReferenceTypeChange = useCallback((newType: 'image' | 'text') => {
    setReferenceType(newType);
    // Reset related states when switching types
    if (newType === 'text') {
      setReferenceText('');
      setDetectedTextData(null);
      // Reset image processing options when switching to text
      setImageProcessingOptions({ autocrop: false, removeBackground: false });
    }
  }, []);

  return {
    // Include all verification functionality
    ...verification,

    // References functionality
    availableReferences,
    referencesLoading,
    fetchAvailableReferences,
    getModelReferences,

    // Editor-specific state
    referenceName,
    capturedReferenceImage,
    hasCaptured,
    pendingSave,
    showConfirmDialog,
    referenceSaveCounter,
    referenceText,
    referenceType,
    detectedTextData,
    textImageFilter,
    selectedReferenceImage,
    selectedReferenceInfo,
    imageProcessingOptions,
    canCapture,
    canSave,
    allowSelection,
    verificationsCollapsed,
    captureCollapsed,

    // Editor-specific setters
    setReferenceName,
    setCapturedReferenceImage,
    setHasCaptured,
    setShowConfirmDialog,
    setPendingSave,
    setReferenceText,
    setTextImageFilter,
    setImageProcessingOptions,
    setVerificationsCollapsed,
    setCaptureCollapsed,

    // Editor-specific handlers
    handleReferenceSelected,
    handleCaptureReference,
    handleSaveReference,
    handleAutoDetectText,
    validateRegex,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    handleReferenceTypeChange,
  };
};

export type UseVerificationEditorType = ReturnType<typeof useVerificationEditor>;
