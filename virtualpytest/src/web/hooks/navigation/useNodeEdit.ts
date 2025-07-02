import { useCallback, useState, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { NodeForm, UINavigationNode } from '../../types/pages/Navigation_Types';
import { Verification } from '../../types/verification/Verification_Types';
import { useVerification } from '../verification/useVerification';

export interface UseNodeEditProps {
  isOpen: boolean;
  nodeForm: NodeForm | null;
  setNodeForm: (form: NodeForm) => void;
  selectedHost?: Host;
  isControlActive?: boolean;
}

export const useNodeEdit = ({
  isOpen,
  nodeForm,
  setNodeForm,
  selectedHost,
  isControlActive = false,
}: UseNodeEditProps) => {
  // Verification hook for managing verifications
  const verification = useVerification({
    selectedHost: selectedHost || null,
    captureSourcePath: undefined,
  });

  // Local state for dialog-specific concerns
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const [gotoResult, setGotoResult] = useState('');

  // Initialize verifications ONCE when dialog opens - stable dependency
  useEffect(() => {
    if (isOpen && nodeForm?.verifications) {
      verification.handleVerificationsChange(nodeForm.verifications);
    }
  }, [isOpen]); // Only depend on isOpen to avoid infinite loops

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSaveSuccess(false);
      setGotoResult('');
      verification.handleVerificationsChange([]);
    }
  }, [isOpen]);

  // Handle verification changes
  const handleVerificationsChange = useCallback(
    (newVerifications: Verification[]) => {
      if (!nodeForm) return;

      setNodeForm({
        ...nodeForm,
        verifications: newVerifications,
      });
      verification.handleVerificationsChange(newVerifications);
    },
    [nodeForm, setNodeForm, verification.handleVerificationsChange],
  );

  // Handle save operation
  const handleSave = useCallback((onSubmit: () => void) => {
    onSubmit();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }, []);

  // Validate form
  const isFormValid = useCallback(
    (form: NodeForm | null) => {
      if (!form?.label?.trim()) return false;

      return verification.verifications.every((verificationItem) => {
        if (!verificationItem.command) return true;

        if (verificationItem.verification_type === 'image') {
          return Boolean(verificationItem.params?.image_path);
        } else if (verificationItem.verification_type === 'text') {
          return Boolean(verificationItem.params?.text);
        }

        return true;
      });
    },
    [verification.verifications],
  );

  // Run goto operation
  const runGoto = useCallback(async () => {
    if (!isControlActive || !selectedHost) return;

    setIsRunningGoto(true);
    setGotoResult('Running goto operation...');

    try {
      // Mock implementation - replace with actual goto logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGotoResult('✅ Goto operation completed successfully');
    } catch (error) {
      setGotoResult(`❌ Goto operation failed: ${error}`);
    } finally {
      setIsRunningGoto(false);
    }
  }, [isControlActive, selectedHost]);

  // Get parent names from parent IDs
  const getParentNames = useCallback((parentIds: string[], nodes: UINavigationNode[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None';

    const parentNames = parentIds.map((id) => {
      const parentNode = nodes.find((node) => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });

    return parentNames.join(' > ');
  }, []);

  // Check button visibility
  const getButtonVisibility = useCallback(() => {
    return {
      canRunGoto: isControlActive && Boolean(selectedHost),
      canTest: isControlActive && Boolean(selectedHost) && verification.verifications.length > 0,
    };
  }, [isControlActive, selectedHost, verification.verifications.length]);

  return {
    // Verification
    verification,
    handleVerificationsChange,

    // Form validation and actions
    handleSave,
    isFormValid,
    saveSuccess,

    // Navigation
    runGoto,
    isRunningGoto,
    gotoResult,

    // Utilities
    getParentNames,
    getButtonVisibility,
  };
};
