import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  IconButton,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  Chip,
} from '@mui/material';
import { 
  Camera as CameraIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import { NodeVerificationsList } from '../navigation/NodeVerificationsList';
import { styled } from '@mui/material/styles';
import { VerificationEditorLayoutConfig, getVerificationEditorLayout } from '../../../config/layoutConfig';

interface VerificationAction {
  id: string;
  label: string;
  command: string;
  params: any;
  description: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface VerificationActions {
  [category: string]: VerificationAction[];
}

interface NodeVerification {
  id: string;
  label: string;
  command: string;
  controller_type: 'text' | 'image' | 'adb';
  params: any;
  description?: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
}

// Centralized VerificationTestResult interface - MUST match NodeVerificationsList.tsx
// This ensures all verification types (text, image, ADB) use the same result structure
// and are handled uniformly throughout the application
interface VerificationTestResult {
  success: boolean;
  message?: string;
  error?: string;
  threshold?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  sourceImageUrl?: string;
  referenceImageUrl?: string;
  extractedText?: string;
  searchedText?: string;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  // Language detection for text verifications
  detectedLanguage?: string;
  languageConfidence?: number;
  // ADB-specific result data
  search_term?: string;
  wait_time?: number;
  total_matches?: number;
  matches?: Array<{
    element_id: number;
    matched_attribute: string;
    matched_value: string;
    match_reason: string;
    search_term: string;
    case_match: string;
    all_matches: Array<{
      attribute: string;
      value: string;
      reason: string;
    }>;
    full_element: {
      id: number;
      text: string;
      resourceId: string;
      contentDesc: string;
      className: string;
      bounds: string;
      clickable: boolean;
      enabled: boolean;
      tag?: string;
    };
  }>;
}

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VerificationEditorProps {
  isVisible: boolean;
  isScreenshotMode: boolean;
  isCaptureActive: boolean;
  captureImageRef?: React.RefObject<HTMLImageElement>;
  captureImageDimensions?: { width: number; height: number };
  originalImageDimensions?: { width: number; height: number };
  captureSourcePath?: string;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  model: string;
  // VideoCapture component state
  videoFramesPath?: string;
  totalFrames?: number;
  currentFrame?: number;
  // ScreenshotCapture component state  
  screenshotPath?: string;
  sx?: any;
  onReferenceSaved?: (referenceName: string) => void;
  layoutConfig?: VerificationEditorLayoutConfig; // Allow direct override if needed
}

export const VerificationEditor: React.FC<VerificationEditorProps> = ({
  isVisible,
  isScreenshotMode,
  isCaptureActive,
  captureImageRef,
  captureImageDimensions,
  originalImageDimensions,
  captureSourcePath,
  selectedArea,
  onAreaSelected,
  onClearSelection,
  model,
  // VideoCapture component state
  videoFramesPath,
  totalFrames,
  currentFrame,
  // ScreenshotCapture component state  
  screenshotPath,
  sx = {},
  onReferenceSaved,
  layoutConfig,
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string>('default_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<VerificationTestResult[]>([]);
  
  // Collapsible sections state
  const [captureCollapsed, setCaptureCollapsed] = useState<boolean>(false);
  const [verificationsCollapsed, setVerificationsCollapsed] = useState<boolean>(false);

  const captureContainerRef = useRef<HTMLDivElement>(null);

  const [tempReferenceUrl, setTempReferenceUrl] = useState<string>('');
  const [referenceText, setReferenceText] = useState<string>('');
  const [referenceType, setReferenceType] = useState<'image' | 'text'>('image');
  const [detectedTextData, setDetectedTextData] = useState<{
    text: string;
    fontSize: number;
    confidence: number;
    detectedLanguage?: string;
    detectedLanguageName?: string;
    languageConfidence?: number;
  } | null>(null);
  const [textImageFilter, setTextImageFilter] = useState<'none' | 'greyscale' | 'binary'>('none');
  const [referenceSaveCounter, setReferenceSaveCounter] = useState<number>(0);

  // Image processing options for capture only
  const [imageProcessingOptions, setImageProcessingOptions] = useState({
    autocrop: false,
    removeBackground: false
  });

  // Use the provided layout config or get it from the model type
  const finalLayoutConfig = layoutConfig || getVerificationEditorLayout(model);

  useEffect(() => {
    if (isVisible) {
      fetchVerificationActions();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!model || model.trim() === '') {
      console.error('[@component:VerificationEditor] Model prop is required but not provided');
      setError('Model is required for verification editor');
    } else {
      console.log(`[@component:VerificationEditor] Using model: ${model}`);
    }
  }, [model]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchVerificationActions = async () => {
    try {
      const response = await fetch('http://192.168.1.67:5009/api/virtualpytest/verification/actions');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setVerificationActions(result.verifications);
        }
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error fetching verification actions:', error);
    }
  };

  const handleVerificationsChange = (newVerifications: NodeVerification[]) => {
    setVerifications(newVerifications);
    // Clear test results when verifications change
    setTestResults([]);
  };

  const handleClearSelection = () => {
    setCapturedReferenceImage(null);
    setHasCaptured(false);
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleCaptureReference = async () => {
    if (!selectedArea) {
      console.error('[@component:VerificationEditor] Missing area selection for capture');
      return;
    }

    if (!captureSourcePath) {
      console.error('[@component:VerificationEditor] No capture source path available');
      return;
    }

    console.log('[@component:VerificationEditor] Capturing temporary reference:', {
      area: selectedArea,
      sourcePath: captureSourcePath,
      processingOptions: referenceType === 'image' ? imageProcessingOptions : undefined
    });

    try {
      let captureResponse;
      
      if (referenceType === 'image' && (imageProcessingOptions.autocrop || imageProcessingOptions.removeBackground)) {
        console.log('[@component:VerificationEditor] Using process-area endpoint with processing options');
        captureResponse = await fetch('http://192.168.1.67:5009/api/virtualpytest/reference/process-area', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            area: selectedArea,
            source_path: captureSourcePath,
            reference_name: referenceName,
            model: model,
            autocrop: imageProcessingOptions.autocrop,
            remove_background: imageProcessingOptions.removeBackground
          }),
        });
      } else {
        console.log('[@component:VerificationEditor] Using standard capture endpoint');
        captureResponse = await fetch('http://192.168.1.67:5009/api/virtualpytest/reference/capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            area: selectedArea,
            source_path: captureSourcePath,
            reference_name: referenceName,
            model: model
          }),
        });
      }

      const result = await captureResponse.json();
      
      if (result.success) {
        const timestamp = new Date().getTime();
        // Server now returns complete URLs, so use them directly with cache-busting timestamp
        const imageUrl = `${result.image_url}?t=${timestamp}`;
        console.log('[@component:VerificationEditor] Temporary capture created successfully, setting image URL:', imageUrl);
        setCapturedReferenceImage(imageUrl);
        setHasCaptured(true);
        
        // If autocrop was applied and new area dimensions are provided, update the selected area
        if (imageProcessingOptions.autocrop && result.processed_area && onAreaSelected) {
          console.log('[@component:VerificationEditor] Updating area after autocrop:', result.processed_area);
          onAreaSelected({
            x: result.processed_area.x,
            y: result.processed_area.y,
            width: result.processed_area.width,
            height: result.processed_area.height
          });
        }
      } else {
        console.error('[@component:VerificationEditor] Failed to capture reference:', result.error);
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error capturing reference:', error);
    }
  };

  const checkReferenceExists = async (referenceName: string, modelName: string, referenceType: 'image' | 'text'): Promise<boolean> => {
    try {
      if (referenceType === 'image') {
        // Check if the image reference already exists by trying to fetch it
        const response = await fetch(`http://192.168.1.67:5009/api/virtualpytest/reference/image/${modelName}/${referenceName}.png`);
        return response.ok;
      } else if (referenceType === 'text') {
        // Check if text reference exists by fetching the reference list and looking for matching name/model
        const response = await fetch('http://192.168.1.67:5009/api/virtualpytest/reference/list');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.references) {
            return result.references.some((ref: any) => 
              ref.name === referenceName && 
              ref.model === modelName && 
              ref.type === 'text'
            );
          }
        }
        return false;
      }
      return false;
    } catch (error) {
      // If there's an error fetching, assume it doesn't exist
      return false;
    }
  };

  const handleSaveReference = async () => {
    if (!referenceName.trim() || !selectedArea || !model) {
      console.log('[@component:VerificationEditor] Cannot save: missing reference name, area, or model');
      return;
    }

    // Validate regex for text references before checking existence
    if (referenceType === 'text' && !validateRegex(referenceText)) {
      console.error('[@component:VerificationEditor] Invalid regex pattern:', referenceText);
      return;
    }

    try {
      // Check if reference already exists
      const exists = await checkReferenceExists(referenceName, model, referenceType);
      
      if (exists) {
        // Show confirmation dialog for both image and text references
        console.log(`[@component:VerificationEditor] ${referenceType} reference "${referenceName}" already exists, showing confirmation`);
        setShowConfirmDialog(true);
        return;
      }

      // If doesn't exist, proceed with save
      await performSaveReference();

    } catch (error) {
      console.error('[@component:VerificationEditor] Error checking/saving reference:', error);
    }
  };

  const performSaveReference = async () => {
    try {
      console.log('[@component:VerificationEditor] Saving reference:', { 
        name: referenceName, 
        type: referenceType, 
        area: selectedArea 
      });

      if (referenceType === 'image') {
        // Save image reference
        const response = await fetch('http://192.168.1.67:5009/api/virtualpytest/reference/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reference_name: referenceName,
            model_name: model,
            area: selectedArea,
            reference_type: 'reference_image',
            source_path: captureSourcePath  // Add source path to help build cropped filename
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('[@component:VerificationEditor] Image reference saved successfully');
          const publicUrl = result.public_url;
          setSuccessMessage(`Image reference "${referenceName}" saved successfully! Available at: ${publicUrl}`);
          setTempReferenceUrl('');
          setReferenceSaveCounter(prev => prev + 1);
          onReferenceSaved?.(referenceName);
        } else {
          console.error('[@component:VerificationEditor] Failed to save image reference:', result.error);
          setSuccessMessage(`Failed to save image reference: ${result.error}`);
        }
      } else if (referenceType === 'text') {
        // Save text reference
        const response = await fetch('http://192.168.1.67:5009/api/virtualpytest/reference/text/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: referenceName,
            model: model,
            area: selectedArea,
            text: referenceText,
            fontSize: detectedTextData?.fontSize,
            confidence: detectedTextData?.confidence
          }),
        });

        if (response.ok) {
          console.log('[@component:VerificationEditor] Text reference saved successfully');
          setSuccessMessage(`Text reference "${referenceName}" saved successfully!`);
          setDetectedTextData(null);
          setReferenceSaveCounter(prev => prev + 1);
          onReferenceSaved?.(referenceName);
        } else {
          console.error('[@component:VerificationEditor] Failed to save text reference:', response.status);
        }
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error saving reference:', error);
    }
  };

  const handleTest = async (event?: React.MouseEvent) => {
    // Prevent any default form submission behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (verifications.length === 0) {
      console.log('[@component:VerificationEditor] No verifications to test');
      return;
    }

    console.log('[@component:VerificationEditor] Running verification tests:', verifications);
    
    try {
      setLoading(true);
      setError(null);

      // Step 1: Initialize verification controllers
      console.log('[@component:VerificationEditor] Initializing verification controllers...');
      const initResponse = await fetch('http://192.168.1.67:5009/api/virtualpytest/verification/take-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          av_controller_type: model // Use the dynamic model instead of hardcoded 'android_mobile'
        }),
      });

      const initResult = await initResponse.json();
      if (!initResult.success) {
        setError(`Failed to initialize verification controllers: ${initResult.error}`);
        console.error('[@component:VerificationEditor] Controller initialization failed:', initResult.error);
        return;
      }

      console.log('[@component:VerificationEditor] Controllers initialized successfully');

      // Step 2: Prepare verifications for API call
      const verificationsToExecute = verifications.map(verification => {
        // Start with all existing params including area coordinates
        let updatedParams = { ...verification.params };
        
        console.log('[@component:VerificationEditor] Debug verification params for image:', {
          full_path: verification.params?.full_path,
          reference_path: verification.params?.reference_path,
          reference_image: verification.params?.reference_image,
          inputValue: verification.inputValue
        });
        
        if (verification.controller_type === 'image') {
          // Handle image verification parameters
          if (verification.params?.full_path) {
            // Use full absolute path from reference data
            updatedParams.image_path = verification.params.full_path;
          } else if (verification.params?.reference_path) {
            // Fallback to relative path (may need to be converted to absolute)
            updatedParams.image_path = verification.params.reference_path;
          } else if (verification.inputValue) {
            // Manual input
            updatedParams.image_path = verification.inputValue;
          } else {
            // No image path provided
            updatedParams.image_path = '';
          }
        } else if (verification.controller_type === 'text') {
          // Handle text verification parameters
          if (verification.params?.reference_text) {
            // Use text from reference data
            updatedParams.text = verification.params.reference_text;
          } else if (verification.inputValue) {
            // Manual input
            updatedParams.text = verification.inputValue;
          } else {
            // No text provided
            updatedParams.text = '';
          }
          
          // Add text-specific parameters
          if (verification.params?.font_size) {
            updatedParams.font_size = verification.params.font_size;
          }
          if (verification.params?.confidence) {
            updatedParams.confidence = verification.params.confidence;
          }
        }
        
        // Determine what images to provide based on component state
        if (isScreenshotMode && screenshotPath) {
          // Screenshot mode with screenshot available
          updatedParams.image_list = [screenshotPath];
          console.log('[@component:VerificationEditor] Using screenshot for verification:', screenshotPath);
        } else if (!isScreenshotMode && videoFramesPath && totalFrames && totalFrames > 0) {
          // Video mode with saved frames available
          const framesList = [];
          for (let i = 0; i < totalFrames; i++) {
            const isCaptureFrames = videoFramesPath.includes('captures');
            let framePath;
            if (isCaptureFrames) {
              framePath = `${videoFramesPath}/capture_${i + 1}.jpg`;
            } else {
              framePath = `${videoFramesPath}/frame_${i.toString().padStart(4, '0')}.jpg`;
            }
            framesList.push(framePath);
          }
          updatedParams.image_list = framesList;
          console.log(`[@component:VerificationEditor] Using ${framesList.length} saved frames for verification from:`, videoFramesPath);
        } else if (!isScreenshotMode && isCaptureActive) {
          // Video mode with active capture - backend will check /tmp/captures
          console.log('[@component:VerificationEditor] Video capture is active - backend will use /tmp/captures frames');
        } else {
          // No existing images - will start new capture
          console.log('[@component:VerificationEditor] No existing images - will start new capture');
        }
        
        // Ensure area coordinates are included (from reference or manual input)
        if (verification.params?.area) {
          updatedParams.area = verification.params.area;
          console.log('[@component:VerificationEditor] Including area for verification:', updatedParams.area);
        }
        
        // Use actual timeout from verification params instead of hardcoded value
        if (verification.params?.timeout) {
          updatedParams.timeout = verification.params.timeout;
          console.log('[@component:VerificationEditor] Using timeout from verification params:', updatedParams.timeout);
        }

        return {
          ...verification,
          params: updatedParams
        };
      });

      console.log('[@component:VerificationEditor] Executing verifications with details:');
      verificationsToExecute.forEach((verification, index) => {
        let strategy = 'Will start new capture';
        if (verification.params?.image_list && verification.params.image_list.length > 0) {
          if (isScreenshotMode) {
            strategy = `Using existing screenshot: ${verification.params.image_list[0]}`;
          } else {
            strategy = `Using ${verification.params.image_list.length} existing frames from: ${videoFramesPath}`;
          }
        } else if (!isScreenshotMode && isCaptureActive) {
          strategy = 'Using active capture frames from /tmp/captures';
        }
        
        console.log(`[@component:VerificationEditor] Verification ${index + 1}:`, {
          id: verification.id,
          command: verification.command,
          controller_type: verification.controller_type,
          strategy: strategy,
          timeout: verification.params?.timeout,
          area: verification.params?.area,
          image_path: verification.params?.image_path
        });
      });

      // Step 3: Call the batch verification API
      const response = await fetch('http://192.168.1.67:5009/api/virtualpytest/verification/execute-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifications: verificationsToExecute,
          node_id: 'verification_editor_test',
          tree_id: 'manual_test',
          model: model  // Pass model name for organizing output images
        }),
      });

      const result = await response.json();
      console.log('[@component:VerificationEditor] Test results:', result);
      
      // Store test results for display
      const newTestResults: VerificationTestResult[] = [];
      if (result.results) {
        result.results.forEach((res: any, index: number) => {
          const status = res.success ? 'PASSED' : 'FAILED';
          console.log(`[@component:VerificationEditor] Verification ${index + 1}: ${status} - ${res.message || res.error || 'No details'}`);
          
          // Use threshold directly from response (backend handles all processing)
          let threshold: number | undefined = undefined;
          if (verificationsToExecute[index]?.controller_type === 'image' || verificationsToExecute[index]?.controller_type === 'text') {
            // Use threshold directly from response (already processed by backend for appear/disappear operations)
            if (res.threshold !== undefined && res.threshold !== null) {
              // Clamp confidence to minimum of 0.0 (no negative confidence values)
              threshold = Math.max(0.0, res.threshold);
              console.log(`[@component:VerificationEditor] Using threshold from response: ${res.threshold} (clamped to: ${threshold})`);
            } else {
              // Fallback to verification params if backend didn't provide threshold
              threshold = verificationsToExecute[index]?.params?.threshold || 0.0;
              console.log(`[@component:VerificationEditor] Using fallback threshold: ${threshold}`);
            }
          }
          
          // Determine if this is an ERROR (technical issue) or FAIL (test result)
          let resultType: 'PASS' | 'FAIL' | 'ERROR' = 'ERROR';
          if (res.success) {
            resultType = 'PASS';
          } else {
            // Check if this is a technical error vs test failure
            const errorMessage = res.message || res.error || '';
            
            // Text/Image not found should be FAIL (test failure), not ERROR (technical issue)
            const isTestFailure = errorMessage.includes('Text pattern') ||
                                 errorMessage.includes('Image not found') ||
                                 errorMessage.includes('not found after') ||
                                 errorMessage.includes('Best confidence:') ||
                                 errorMessage.includes('Closest text found:');
            
            // Technical errors are things like file access, OCR failures, etc.
            const isTechnicalError = errorMessage.includes('Could not load') || 
                                    errorMessage.includes('Failed to capture') ||
                                    errorMessage.includes('Failed to re-capture') ||
                                    errorMessage.includes('OCR failed') ||
                                    errorMessage.includes('controller not') ||
                                    errorMessage.includes('No text specified') ||
                                    errorMessage.includes('No reference image specified') ||
                                    errorMessage.includes('ERROR:');
            
            if (isTestFailure) {
              resultType = 'FAIL';
            } else if (isTechnicalError) {
              resultType = 'ERROR';
            } else {
              // Default to FAIL for unknown cases (better to show as test failure than technical error)
              resultType = 'FAIL';
            }
          }
          
          console.log(`[@component:VerificationEditor] Verification ${index + 1} result:`, {
            success: res.success,
            resultType: resultType,
            message: res.message,
            error: res.error,
            extractedThreshold: threshold,
            controllerType: verificationsToExecute[index]?.controller_type,
            sourceImageUrl: res.source_image_url,
            referenceImageUrl: res.reference_image_url,
            extractedText: res.extracted_text,
            searchedText: res.searched_text
          });

          // Improve message for very low confidence scores (originally negative)
          let displayMessage = res.message;
          if (res.threshold !== undefined && res.threshold < 0 && threshold !== undefined) {
            // Original confidence was negative, provide clearer message
            const requiredThreshold = verificationsToExecute[index]?.params?.threshold || 0.8;
            displayMessage = `Image not found. Images appear completely different (confidence: ${(threshold * 100).toFixed(1)}%, required: ${(requiredThreshold * 100).toFixed(0)}%)`;
          }

          newTestResults.push({
            success: res.success,
            message: displayMessage,
            error: res.error,
            threshold,
            resultType: resultType,
            // Add image comparison data for UI thumbnails - fix property names
            sourceImageUrl: res.source_image_url,
            referenceImageUrl: res.reference_image_url,
            // Add text comparison data
            extractedText: res.extracted_text,
            searchedText: res.searched_text,
            imageFilter: res.image_filter,
            // Language detection for text verifications
            detectedLanguage: res.detected_language,
            languageConfidence: res.language_confidence,
            // ADB-specific result data
            search_term: res.search_term,
            wait_time: res.wait_time,
            total_matches: res.total_matches,
            matches: res.matches
          });
        });
      }
      setTestResults(newTestResults);
      
      if (result.success) {
        const passedCount = result.passed_count || 0;
        const totalCount = result.total_verifications || verifications.length;
        
        // Clear any previous errors since we have results
        setError(null);
        
        if (passedCount === totalCount) {
          setSuccessMessage(`All ${totalCount} verification(s) passed!`);
        } else {
          setSuccessMessage(`${passedCount}/${totalCount} verification(s) passed. Check results below.`);
        }
      } else {
        // Clear any previous errors and show success message with results info
        setError(null);
       
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error running tests:', error);
      setError('Failed to run verification tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetectText = async () => {
    if (!selectedArea || !model) {
      console.log('[@component:VerificationEditor] Cannot auto-detect: missing area or model');
      return;
    }

    if (!captureSourcePath) {
      console.log('[@component:VerificationEditor] Cannot auto-detect: missing capture source path');
      return;
    }

    try {
      console.log('[@component:VerificationEditor] Starting text auto-detection in area:', selectedArea);
      
      const response = await fetch('http://192.168.1.67:5009/api/virtualpytest/reference/text/auto-detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          area: selectedArea,
          source_path: captureSourcePath,
          image_filter: textImageFilter
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[@component:VerificationEditor] Text auto-detection successful:', result);
        
        setDetectedTextData({
          text: result.detected_text,
          fontSize: result.font_size,
          confidence: result.confidence,
          detectedLanguage: result.detected_language,
          detectedLanguageName: result.detected_language_name,
          languageConfidence: result.language_confidence
        });
        
        // Pre-fill the text input with detected text
        setReferenceText(result.detected_text);
        
        // Use the preview URL returned from the backend (not hardcoded capture.png)
        if (result.preview_url) {
          // Check if result.preview_url is already a complete URL
          const previewUrl = result.preview_url.startsWith('http://') || result.preview_url.startsWith('https://') 
            ? result.preview_url
            : `https://77.56.53.130:444${result.preview_url}`;
          console.log('[@component:VerificationEditor] Setting preview from backend response:', previewUrl);
          setCapturedReferenceImage(previewUrl);
          setHasCaptured(true);
        } else {
          console.warn('[@component:VerificationEditor] No preview URL in backend response');
        }
      } else {
        const errorResult = await response.json();
        console.error('[@component:VerificationEditor] Text auto-detection failed:', response.status, errorResult);
        
        // Still show preview even if OCR failed (but area was cropped)
        if (errorResult.preview_url) {
          // Check if errorResult.preview_url is already a complete URL
          const previewUrl = errorResult.preview_url.startsWith('http://') || errorResult.preview_url.startsWith('https://') 
            ? errorResult.preview_url
            : `https://77.56.53.130:444${errorResult.preview_url}`;
          console.log('[@component:VerificationEditor] Setting preview from error response:', previewUrl);
          setCapturedReferenceImage(previewUrl);
          setHasCaptured(true);
        }
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error during text auto-detection:', error);
    }
  };

  const validateRegex = (text: string): boolean => {
    if (!text) return true; // Empty text is valid
    
    try {
      new RegExp(text);
      return true;
    } catch (error) {
      return false;
    }
  };

  const canCapture = selectedArea;
  const canSave = (() => {
    if (!referenceName.trim() || !selectedArea || !model || model.trim() === '') {
      return false;
    }
    
    if (referenceType === 'image') {
      return hasCaptured; // Image type requires capture
    } else if (referenceType === 'text') {
      return referenceText.trim() !== '' && validateRegex(referenceText); // Text type requires valid text/regex
    }
    
    return false;
  })();
  const allowSelection = !isCaptureActive && captureSourcePath && captureImageRef;

  const handleConfirmOverwrite = async () => {
    setShowConfirmDialog(false);
    await performSaveReference();
  };

  const handleCancelOverwrite = () => {
    setShowConfirmDialog(false);
  };

  if (!isVisible) return null;

  if (!model || model.trim() === '') {
    return (
      <Box sx={{ 
        width: finalLayoutConfig.isMobileModel ? finalLayoutConfig.width : '350px', // Fixed larger width for landscape models
        height: finalLayoutConfig.height, 
        p: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 1,
        alignItems: 'center',
        justifyContent: 'center',
        ...sx 
      }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: 'error.main' }}>
          Configuration Error
        </Typography>
        <Typography variant="body2" sx={{ color: 'error.main', textAlign: 'center' }}>
          Model prop is required for the Verification Editor
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: finalLayoutConfig.width, 
      height: finalLayoutConfig.height, 
      p: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      '&::-webkit-scrollbar': {
        width: '6px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(255,255,255,0.3)',
        borderRadius: '3px',
        '&:hover': {
          background: 'rgba(255,255,255,0.5)',
        },
      },
      ...sx 
    }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
        Verification Editor
        <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}>
          ({model}) {!finalLayoutConfig.isMobileModel && <Typography component="span" sx={{ fontSize: '0.7rem' }}>[Landscape]</Typography>}
        </Typography>
      </Typography>
      
      {/* Show error message if any */}
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {error}
        </Typography>
      )}

      {/* =================== CAPTURE SECTION =================== */}
      <Box>
        {/* Capture Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={() => setCaptureCollapsed(!captureCollapsed)}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            {captureCollapsed ? (
              <ArrowRightIcon sx={{ fontSize: '1rem' }} />
            ) : (
              <ArrowDownIcon sx={{ fontSize: '1rem' }} />
            )}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Capture
          </Typography>
        </Box>

        {/* Collapsible Capture Content */}
        <Collapse in={!captureCollapsed}>
          <Box>
            {/* 1. Capture Container (Reference Image Preview) */}
            <Box>
              <Box 
                ref={captureContainerRef}
                sx={{ 
                  position: 'relative',
                  width: '100%', 
                  height: finalLayoutConfig.captureHeight, 
                  border: '2px dashed #444', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  mb: 1.5
                }}
              >
                {capturedReferenceImage ? (
                  <>
                    <img 
                      src={capturedReferenceImage}
                      alt="Reference"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: finalLayoutConfig.objectFit,
                        maxHeight: finalLayoutConfig.isMobileModel ? 'none' : '100%'
                      }}
                    />
                    {/* Success message overlay */}
                    {successMessage && (
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 10
                      }}>
                        <Typography variant="body2" sx={{ 
                          color: '#4caf50', 
                          fontSize: '0.9rem', 
                          fontWeight: 600,
                          textAlign: 'center',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          {successMessage}
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', textAlign: 'center', px: 0.5 }}>
                    {allowSelection ? 'Drag area on main image' : 'No image'}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* 2. Drag Area Info (Selection Info) */}
            <Box sx={{ mb: 0 }}>
              {selectedArea ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5 }}>
                  <TextField
                    size="small"
                    label="X"
                    type="number"
                    value={Math.round(selectedArea.x)}
                    onChange={(e) => {
                      const newX = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          x: newX
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Y"
                    type="number"
                    value={Math.round(selectedArea.y)}
                    onChange={(e) => {
                      const newY = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          y: newY
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Width"
                    type="number"
                    value={Math.round(selectedArea.width)}
                    onChange={(e) => {
                      const newWidth = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          width: newWidth
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Height"
                    type="number"
                    value={Math.round(selectedArea.height)}
                    onChange={(e) => {
                      const newHeight = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          height: newHeight
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                </Box>
              ) : (
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                  No area selected
                </Typography>
              )}
            </Box>

            {/* 3. Reference Type Selection with Image Processing Options */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0, flexWrap: 'wrap' }}>
              
              <RadioGroup
                row
                value={referenceType}
                onChange={(e) => {
                  setReferenceType(e.target.value as 'image' | 'text');
                  // Reset related states when switching types
                  if (e.target.value === 'text') {
                    setReferenceText('');
                    setDetectedTextData(null);
                    // Reset image processing options when switching to text
                    setImageProcessingOptions({ autocrop: false, removeBackground: false });
                  } else {
                    setTempReferenceUrl('');
                  }
                }}
                sx={{
                  gap: 1,
                  '& .MuiFormControlLabel-root': {
                    margin: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.7rem',
                    },
                  },
                }}
              >
                <FormControlLabel value="image" control={<Radio size="small" />} label="Image" />
                <FormControlLabel value="text" control={<Radio size="small" />} label="Text" />
              </RadioGroup>

              {/* Image Processing Options (only for image type) */}
              {referenceType === 'image' && (
                <>
                  <FormControlLabel
                    control={
                      <input
                        type="checkbox"
                        checked={imageProcessingOptions.autocrop}
                        onChange={(e) => setImageProcessingOptions(prev => ({ 
                          ...prev, 
                          autocrop: e.target.checked 
                        }))}
                        style={{ transform: 'scale(0.8)' }}
                      />
                    }
                    label="Auto-crop"
                    sx={{
                      margin: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.9)',
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <input
                        type="checkbox"
                        checked={imageProcessingOptions.removeBackground}
                        onChange={(e) => setImageProcessingOptions(prev => ({ 
                          ...prev, 
                          removeBackground: e.target.checked 
                        }))}
                        style={{ transform: 'scale(0.8)' }}
                      />
                    }
                    label="Remove background"
                    sx={{
                      margin: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.9)',
                      },
                    }}
                  />
                </>
              )}
            </Box>

            {/* 4. Text Input and Auto-Detect (only for text type) */}
            {referenceType === 'text' && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0.5 }}>
                <TextField
                  size="small"
                  label="Text / Regex Pattern"
                  placeholder="Enter text to find or regex pattern"
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  error={!!(referenceText && !validateRegex(referenceText))}
                  helperText={referenceText && !validateRegex(referenceText) ? 'Invalid regex pattern' : ''}
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-input': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiFormHelperText-root': {
                      fontSize: '0.65rem',
                    },
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleAutoDetectText}
                  disabled={!selectedArea || !model || !captureSourcePath}
                  sx={{
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Auto-Detect
                </Button>
              </Box>
            )}

            {/* 5. Detected Text Info (only for text type with detected data) */}
            {referenceType === 'text' && detectedTextData && (
              <Box sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  Detected: Font Size {detectedTextData.fontSize}px, 
                  Confidence {(detectedTextData.confidence * 100).toFixed(1)}%
                  {detectedTextData.detectedLanguageName && (
                    <>, Language: {detectedTextData.detectedLanguageName}</>
                  )}
                </Typography>
              </Box>
            )}

            {/* 6. Reference Name + Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0.5 }}>
              {/* Reference Name Input */}
              <TextField
                size="small"
                placeholder="Reference name"
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': {
                    fontSize: '0.75rem',
                  },
                }}
              />

              {/* Action Buttons */}
              {referenceType === 'image' && (
                <Button 
                  size="small" 
                  startIcon={<CameraIcon sx={{ fontSize: '1rem' }} />}
                  variant="contained"
                  onClick={handleCaptureReference}
                  disabled={!canCapture}
                  sx={{
                    bgcolor: '#1976d2',
                    fontSize: '0.75rem',
                    '&:hover': {
                      bgcolor: '#1565c0',
                    },
                    '&:disabled': {
                      bgcolor: '#333',
                      color: 'rgba(255,255,255,0.3)',
                    }
                  }}
                >
                  Capture
                </Button>
              )}
              
              <Button 
                size="small" 
                variant="contained"
                onClick={handleSaveReference}
                disabled={!canSave || pendingSave}
                sx={{
                  bgcolor: '#4caf50',
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: '#45a049',
                  },
                  '&:disabled': {
                    bgcolor: '#333',
                    color: 'rgba(255,255,255,0.3)',
                  }
                }}
              >
                {pendingSave ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* =================== VERIFICATIONS SECTION =================== */}
      <Box>
        {/* Verifications Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={() => setVerificationsCollapsed(!verificationsCollapsed)}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            {verificationsCollapsed ? (
              <ArrowRightIcon sx={{ fontSize: '1rem' }} />
            ) : (
              <ArrowDownIcon sx={{ fontSize: '1rem' }} />
            )}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Verifications
            {model && (
              <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 1 }}>
                ({verifications.length})
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Collapsible Verifications Content */}
        <Collapse in={!verificationsCollapsed}>
          <Box sx={{ 
            '& .MuiTypography-subtitle2': {
              fontSize: '0.75rem',
            },
            '& .MuiButton-root': {
              fontSize: '0.7rem',
            },
            '& .MuiTextField-root': {
              '& .MuiInputLabel-root': {
                fontSize: '0.75rem',
              },
              '& .MuiInputBase-input': {
                fontSize: '0.75rem',
              },
            },
            '& .MuiSelect-root': {
              fontSize: '0.75rem',
            },
            '& .MuiFormControl-root': {
              '& .MuiInputLabel-root': {
                fontSize: '0.75rem',
              },
            },
          }}>
            <NodeVerificationsList
              verifications={verifications}
              availableActions={verificationActions}
              onVerificationsChange={handleVerificationsChange}
              loading={loading}
              error={error}
              model={model}
              onTest={handleTest}
              testResults={testResults}
              reloadTrigger={referenceSaveCounter}
            />
          </Box>
        </Collapse>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCancelOverwrite}
        PaperProps={{
          sx: {
            backgroundColor: '#2E2E2E',
            color: '#ffffff',
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem' }}>
          Warning: Overwrite Reference
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
            A {referenceType} reference named "{referenceName}" already exists for model "{model}".<br />
            Do you want to overwrite it?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button 
            onClick={handleCancelOverwrite}
            variant="outlined"
            size="small"
            sx={{
              borderColor: '#666',
              color: '#ffffff',
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#888',
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmOverwrite}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#f44336',
              fontSize: '0.75rem',
              '&:hover': {
                bgcolor: '#d32f2f',
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VerificationEditor; 