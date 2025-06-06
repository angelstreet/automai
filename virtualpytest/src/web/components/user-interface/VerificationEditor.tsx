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
  // Add properties for verification results
  lastRunResult?: boolean;
  lastRunResults?: boolean[];
  resultImageUrl?: string;
  referenceImageUrl?: string;
  lastRunDetails?: string;
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

  // NEW: State for selected reference image preview
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [selectedReferenceInfo, setSelectedReferenceInfo] = useState<{
    name: string;
    type: 'image' | 'text';
  } | null>(null);

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

  // NEW: Handle reference selection to update preview
  const handleReferenceSelected = (referenceName: string, referenceData: any) => {
    console.log('[@component:VerificationEditor] Reference selected:', referenceName, referenceData);
    
    if (referenceData && referenceData.type === 'image' && referenceData.full_path) {
      // Build the complete URL for the reference image
      const referenceUrl = referenceData.full_path.startsWith('http://') || referenceData.full_path.startsWith('https://') 
        ? referenceData.full_path
        : `https://77.56.53.130:444${referenceData.full_path}`;
      
      console.log('[@component:VerificationEditor] Setting reference image preview:', referenceUrl);
      setSelectedReferenceImage(referenceUrl);
      setSelectedReferenceInfo({
        name: referenceName,
        type: 'image'
      });
      
      // Clear any captured reference since we're now showing a selected reference
      setCapturedReferenceImage(null);
      setHasCaptured(false);
    } else if (referenceData && referenceData.type === 'text') {
      // For text references, clear the image preview
      setSelectedReferenceImage(null);
      setSelectedReferenceInfo({
        name: referenceName,
        type: 'text'
      });
      
      // Clear any captured reference
      setCapturedReferenceImage(null);
      setHasCaptured(false);
    } else {
      // Clear preview if no valid reference
      setSelectedReferenceImage(null);
      setSelectedReferenceInfo(null);
    }
  };

  const handleClearSelection = () => {
    setCapturedReferenceImage(null);
    setHasCaptured(false);
    // Also clear selected reference when clearing selection
    setSelectedReferenceImage(null);
    setSelectedReferenceInfo(null);
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

  const handleSaveReference = async () => {
    if (!referenceName.trim() || !selectedArea || !model) {
      console.log('[@component:VerificationEditor] Cannot save: missing reference name, area, or model');
      return;
    }

    // Validate regex for text references before saving
    if (referenceType === 'text' && !validateRegex(referenceText)) {
      console.error('[@component:VerificationEditor] Invalid regex pattern:', referenceText);
      return;
    }

    try {
      // Proceed directly with save
      await performSaveReference();

    } catch (error) {
      console.error('[@component:VerificationEditor] Error saving reference:', error);
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
      // Clear previous test results
      setTestResults([]);

      // Skip controller initialization since host is directly connected via ADB
      console.log('[@component:VerificationEditor] Executing verifications directly on host...');

      // NEW: Extract capture filename from captureSourcePath for specific capture selection
      let capture_filename = null;
      if (captureSourcePath) {
        // Extract filename from URL like "http://localhost:5009/images/screenshot/android_mobile.jpg?t=1749217510777"
        const url = new URL(captureSourcePath);
        const pathname = url.pathname;
        capture_filename = pathname.split('/').pop()?.split('?')[0]; // Get filename without query params
        console.log('[@component:VerificationEditor] Using specific capture:', capture_filename);
      }

      // Execute batch verification with specific capture
      const batchResponse = await fetch('http://192.168.1.67:5009/api/virtualpytest/verification/execute-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifications: verifications,
          model: model,
          node_id: 'verification-editor',
          tree_id: 'verification-tree',
          capture_filename: capture_filename  // NEW: Send specific capture filename
        }),
      });

      if (!batchResponse.ok) {
        throw new Error(`HTTP ${batchResponse.status}: ${batchResponse.statusText}`);
      }

      const batchResult = await batchResponse.json();
      console.log('[@component:VerificationEditor] Raw batch result:', batchResult);

      // Process results if we have them, regardless of overall batch success
      // The batch can be "unsuccessful" if some verifications failed, but we still want to show the results
      if (batchResult.results && batchResult.results.length > 0) {
        console.log('[@component:VerificationEditor] Processing batch results:', batchResult.results.length, 'results');
        
        // Process and set test results for NodeVerificationsList to display
        const processedResults: VerificationTestResult[] = batchResult.results.map((result: any, index: number) => {
          const verification = verifications[index];
          
          console.log(`[@component:VerificationEditor] Processing result ${index}:`, result);
          
          // Determine result type
          let resultType: 'PASS' | 'FAIL' | 'ERROR' = 'FAIL';
          if (result.success) {
            resultType = 'PASS';
          } else if (result.error && !result.message) {
            resultType = 'ERROR';
          }
          
          const processedResult: VerificationTestResult = {
            success: result.success,
            message: result.message,
            error: result.error,
            threshold: result.confidence || result.threshold, // Use confidence from host result
            resultType: resultType,
            sourceImageUrl: result.sourceImageUrl,
            referenceImageUrl: result.referenceImageUrl,
            extractedText: result.extracted_text,
            searchedText: result.searched_text,
            imageFilter: result.image_filter || verification.params?.image_filter,
            detectedLanguage: result.detected_language,
            languageConfidence: result.language_confidence,
            // Add ADB-specific fields
            search_term: result.search_term,
            wait_time: result.wait_time,
            total_matches: result.total_matches,
            matches: result.matches,
          };
          
          console.log(`[@component:VerificationEditor] Processed result ${index}:`, processedResult);
          return processedResult;
        });
        
        console.log('[@component:VerificationEditor] Setting test results:', processedResults);
        setTestResults(processedResults);
        
        // Update verifications with results (keep existing logic for backward compatibility)
        const updatedVerifications = verifications.map((verification, index) => {
          const result = batchResult.results?.[index];
          if (result) {
            return {
              ...verification,
              lastRunResult: result.success,
              lastRunResults: [result.success],
              resultImageUrl: result.sourceImageUrl,
              referenceImageUrl: result.referenceImageUrl,
              lastRunDetails: result.message || 'Verification completed'
            };
          }
          return verification;
        });
        
        setVerifications(updatedVerifications);
        
        // Show success message with pass/fail count
        const passedCount = batchResult.passed_count || 0;
        const totalCount = batchResult.total_count || processedResults.length;
        setSuccessMessage(`Verification completed: ${passedCount}/${totalCount} passed`);
        
      } else if (batchResult.success === false && batchResult.error) {
        // Only treat as error if there's an actual error and no results
        const errorMessage = batchResult.message || batchResult.error || 'Unknown error occurred';
        console.log('[@component:VerificationEditor] Batch execution failed with error:', errorMessage);
        setError(`Verification failed: ${errorMessage}`);
        // Clear test results on actual failure
        setTestResults([]);
      } else {
        // Fallback case - no results and no clear error
        console.log('[@component:VerificationEditor] No results received from batch execution');
        setError('No verification results received');
        setTestResults([]);
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error running tests:', error);
      setError(`Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Clear test results on error
      setTestResults([]);
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
                      alt="Captured Reference"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
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
                ) : selectedReferenceImage ? (
                  <>
                    <img 
                      src={selectedReferenceImage}
                      alt="Selected Reference"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        maxHeight: finalLayoutConfig.isMobileModel ? 'none' : '100%'
                      }}
                    />
                    {/* Reference info overlay */}
                    <Box sx={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderRadius: 1,
                      padding: '2px 6px',
                      zIndex: 5
                    }}>
                      <Typography variant="caption" sx={{ 
                        color: '#90caf9', 
                        fontSize: '0.65rem', 
                        fontWeight: 600
                      }}>
                        📁 {selectedReferenceInfo?.name}
                      </Typography>
                    </Box>
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
              onReferenceSelected={handleReferenceSelected}
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