import { useState, useCallback, useMemo, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { DragArea } from '../../types/controller/Hdmi_Types';
import { Verification } from '../../types/verification/Verification_Types';
import { useDeviceData } from '../../contexts/device/DeviceDataContext';

import { useVerification } from './useVerification';

// Define interfaces for editor-specific data structures
interface DetectedTextData {
  text: string;
  fontSize: number;
  confidence: number;
  detectedLanguage?: string;
  detectedLanguageName?: string;
  languageConfidence?: number;
  image_textdetected_path?: string;
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
  selectedDeviceId: string;
  captureSourcePath?: string; // TODO: Rename to image_source_url
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  isCaptureActive?: boolean;
  isControlActive?: boolean; // Add control state to trigger reference fetching
}

export const useVerificationEditor = ({
  isVisible: _isVisible,
  selectedHost,
  selectedDeviceId,
  captureSourcePath,
  selectedArea,
  onAreaSelected: _onAreaSelected,
  onClearSelection: _onClearSelection,
  isCaptureActive,
  isControlActive = false, // Default to false if not provided
}: UseVerificationEditorProps) => {
  // Get the selected device from the host's devices array
  const selectedDevice = useMemo(() => {
    return selectedHost?.devices?.find((device) => device.device_id === selectedDeviceId);
  }, [selectedHost, selectedDeviceId]);

  // Get the device model from the selected device
  const deviceModel = selectedDevice?.device_model;

  // Use the pure verification hook for core functionality
  const verification = useVerification({
    selectedHost,
    deviceId: selectedDeviceId,
    captureSourcePath,
  });

  // State for reference capture
  const [referenceName, setReferenceName] = useState<string>('default_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [referenceSaveCounter, setReferenceSaveCounter] = useState<number>(0);

  // Get references from centralized context
  const {
    references: availableReferences,
    referencesLoading,
    getModelReferences,
  } = useDeviceData();

  // Get model references using the device model
  const modelReferences = useMemo(() => {
    if (!deviceModel) {
      return {}; // Return empty object without calling getModelReferences when deviceModel is undefined
    }
    return getModelReferences(deviceModel);
  }, [getModelReferences, deviceModel]);

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
      console.error('[@hook:useVerificationEditor] Please select an area on the screenshot first');
      return;
    }

    console.log('[@hook:useVerificationEditor] Capture reference requested:', {
      selectedArea,
      captureSourcePath,
      referenceName,
      referenceType,
      imageProcessingOptions,
      deviceModel,
    });

    try {
      let captureResponse;

      if (
        referenceType === 'image' &&
        (imageProcessingOptions.autocrop || imageProcessingOptions.removeBackground)
      ) {
        console.log(
          '[@hook:useVerificationEditor] Using processImage endpoint with processing options',
        );
        captureResponse = await fetch(`/server/verification/image/processImage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            device_id: selectedDeviceId, // Send device ID
            area: selectedArea,
            image_source_url: captureSourcePath,
            reference_name: referenceName || 'temp_capture',
            model: deviceModel,
            autocrop: imageProcessingOptions.autocrop,
            remove_background: imageProcessingOptions.removeBackground,
          }),
        });
      } else {
        console.log('[@hook:useVerificationEditor] Using standard cropImage endpoint');
        captureResponse = await fetch(`/server/verification/image/cropImage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            device_id: selectedDeviceId, // Send device ID
            area: selectedArea,
            image_source_url: captureSourcePath,
            reference_name: referenceName || 'temp_capture',
            model: deviceModel,
          }),
        });
      }

      const result = await captureResponse.json();
      console.log('[@hook:useVerificationEditor] Capture response result:', result);

      if (result.success) {
        const timestamp = new Date().getTime();
        // Use new field names with fallback to old ones
        const imageUrl = result.image_cropped_url || result.image_filtered_url || result.image_url;
        const finalImageUrl = `${imageUrl}?t=${timestamp}`;
        console.log(
          '[@hook:useVerificationEditor] Temporary capture created successfully, setting image URL:',
          finalImageUrl,
        );

        setCapturedReferenceImage(finalImageUrl);
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
    selectedDeviceId,
    referenceType,
    imageProcessingOptions,
    _onAreaSelected,
    deviceModel,
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
        model: deviceModel,
        area: selectedArea,
        captureSourcePath: captureSourcePath,
        referenceType: referenceType,
        imageProcessingOptions: imageProcessingOptions,
      });

      // Handle saving based on reference type
      if (referenceType === 'text') {
        // Text references should use processed image from detectText (no cropping needed)
        console.log(
          '[@hook:useVerificationEditor] Saving text reference using processed image from detectText',
        );
        const response = await fetch('/server/verification/text/saveText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            device_id: selectedDeviceId,
            reference_name: referenceName,
            model: deviceModel, // Add device model for server-side processing
            area: selectedArea,
            text: referenceText,
            image_textdetected_path: detectedTextData?.image_textdetected_path || '', // Use processed image from detectText
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log(
            '[@hook:useVerificationEditor] Text reference saved successfully:',
            referenceName,
            result,
          );
          setReferenceSaveCounter((prev) => prev + 1);
          setSaveSuccess(true);

          // Clear success state after 3 seconds (increased from 2)
          setTimeout(() => {
            setSaveSuccess(false);
          }, 3000);
        } else {
          console.error(
            '[@hook:useVerificationEditor] Failed to save text reference:',
            result.error,
          );
        }
      } else {
        // Image references: First capture, then save
        let captureResponse;

        if (imageProcessingOptions.autocrop || imageProcessingOptions.removeBackground) {
          console.log('[@hook:useVerificationEditor] Capturing with processing options for save');
          captureResponse = await fetch(`/server/verification/image/processImage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host: selectedHost,
              device_id: selectedDeviceId,
              area: selectedArea,
              image_source_url: captureSourcePath,
              reference_name: referenceName,
              model: deviceModel,
              autocrop: imageProcessingOptions.autocrop,
              remove_background: imageProcessingOptions.removeBackground,
            }),
          });
        } else {
          console.log('[@hook:useVerificationEditor] Capturing without processing for save');
          captureResponse = await fetch(`/server/verification/image/cropImage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host: selectedHost,
              device_id: selectedDeviceId,
              area: selectedArea,
              image_source_url: captureSourcePath,
              reference_name: referenceName,
              model: deviceModel,
            }),
          });
        }

        const captureResult = await captureResponse.json();

        if (!captureResult.success) {
          throw new Error(captureResult.error || 'Failed to capture area');
        }

        // Image references: Single call uploads to R2 and saves to database
        const response = await fetch('/server/verification/image/saveImage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            reference_name: referenceName,
            model: deviceModel,
            area:
              imageProcessingOptions.autocrop && captureResult.processed_area
                ? captureResult.processed_area
                : selectedArea,
            image_source_url: captureResult.filename, // Use cropped filename as source
            reference_type: referenceType === 'image' ? 'reference_image' : 'screenshot',
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(
            '[@hook:useVerificationEditor] Image reference saved successfully:',
            referenceName,
            result,
          );
          setReferenceSaveCounter((prev) => prev + 1);
          setSaveSuccess(true);

          // Clear success state after 3 seconds (increased from 2)
          setTimeout(() => {
            setSaveSuccess(false);
          }, 3000);
        } else {
          console.error(
            '[@hook:useVerificationEditor] Failed to save reference to database:',
            result.error,
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
    selectedDeviceId,
    referenceType,
    referenceText,
    imageProcessingOptions,
    deviceModel,
    detectedTextData,
  ]);

  // Handle auto-detect text
  const handleAutoDetectText = useCallback(async () => {
    if (!selectedArea) {
      console.log('[@hook:useVerificationEditor] Cannot auto-detect: missing area');
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

      const response = await fetch(`/server/verification/text/detectText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost, // Send full host object
          model: deviceModel,
          area: selectedArea,
          image_source_url: sourceFilename,
          image_filter: textImageFilter,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[@hook:useVerificationEditor] Text auto-detection successful:', result);

        setDetectedTextData({
          text: result.extracted_text || '',
          fontSize: result.font_size || 0,
          confidence: result.confidence || 0,
          detectedLanguage: result.language || result.detected_language,
          detectedLanguageName: result.detected_language_name,
          languageConfidence: result.language_confidence,
          image_textdetected_path: result.image_textdetected_path || result.processed_image_path,
        });

        // Pre-fill the text input with detected text
        setReferenceText(result.extracted_text || '');

        // Display the cropped area image in the drag area (like image cropping does)
        const imageUrl = result.image_textdetected_url || result.image_url;
        if (imageUrl) {
          const timestamp = new Date().getTime();
          const finalImageUrl = `${imageUrl}?t=${timestamp}`;
          console.log(
            '[@hook:useVerificationEditor] Text detection using text detected image URL:',
            finalImageUrl,
          );
          setCapturedReferenceImage(finalImageUrl);
        }

        // Mark as captured
        setHasCaptured(true);
      } else {
        console.error('[@hook:useVerificationEditor] Text auto-detection failed:', result.error);
      }
    } catch (error) {
      console.error('[@hook:useVerificationEditor] Error during text auto-detection:', error);
    }
  }, [selectedArea, selectedHost, captureSourcePath, textImageFilter, deviceModel]);

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
    if (!referenceName.trim() || !selectedArea) {
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
    getModelReferences,
    modelReferences,

    // Editor-specific state
    referenceName,
    capturedReferenceImage,
    hasCaptured,
    pendingSave,
    saveSuccess,
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
