'use client';

import { PlayArrow as PlayArrowIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { useValidation } from '../../hooks/validation';

interface ValidationPreviewClientProps {
  treeId: string;
  onClose?: () => void;
}

export default function ValidationPreviewClient({ treeId, onClose }: ValidationPreviewClientProps) {
  const validation = useValidation(treeId);
  const [selectedEdges, setSelectedEdges] = useState<Set<string>>(new Set());

  // Load preview data when component mounts if not already loaded
  useEffect(() => {
    if (!validation.preview && !validation.isLoadingPreview) {
      validation.loadPreview();
    }
  }, [validation]);

  // Auto-select all edges when preview loads
  useEffect(() => {
    if (validation.preview?.edges) {
      const allEdgeIds = validation.preview.edges.map(
        (edge) => `${edge.from_node}-${edge.to_node}`,
      );
      setSelectedEdges(new Set(allEdgeIds));
    }
  }, [validation.preview]);

  // Close preview when validation starts
  useEffect(() => {
    if (validation.isValidating && onClose) {
      onClose();
    }
  }, [validation.isValidating, onClose]);

  const handleEdgeToggle = (edgeId: string) => {
    setSelectedEdges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(edgeId)) {
        newSet.delete(edgeId);
      } else {
        newSet.add(edgeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (validation.preview?.edges) {
      const allEdgeIds = validation.preview.edges.map(
        (edge) => `${edge.from_node}-${edge.to_node}`,
      );
      setSelectedEdges(new Set(allEdgeIds));
    }
  };

  const handleDeselectAll = () => {
    setSelectedEdges(new Set());
  };

  const handleRunValidation = () => {
    if (!validation.preview?.edges) return;

    // Get skipped edges (edges that are NOT selected)
    const allEdgeIds = validation.preview.edges.map((edge) => `${edge.from_node}-${edge.to_node}`);
    const skippedEdges = allEdgeIds.filter((edgeId) => !selectedEdges.has(edgeId));

    validation.runValidation(skippedEdges);
  };

  // Only show dialog when there's preview data or when loading
  if (!validation.preview && !validation.isLoadingPreview) {
    return null;
  }

  // Show loading dialog
  if (!validation.preview && validation.isLoadingPreview) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogTitle>Validation Preview</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Loading validation preview...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedCount = selectedEdges.size;
  const totalCount = validation.preview?.edges?.length || 0;

  return (
    <Dialog open={true} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <VisibilityIcon />
          <Typography variant="h6">Validation Preview</Typography>
          <Chip
            label={`${selectedCount}/${totalCount} selected`}
            color={selectedCount > 0 ? 'primary' : 'default'}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            This validation will test {totalCount} transitions using NavigationExecutor.
          </Typography>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
          <Button size="small" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button size="small" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </Box>

        <Divider sx={{ my: 1 }} />

        <List dense>
          {validation.preview?.edges?.map((edge, index) => {
            const edgeId = `${edge.from_node}-${edge.to_node}`;
            const isSelected = selectedEdges.has(edgeId);

            return (
              <ListItem key={edgeId} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight="bold">
                        {index + 1}. {edge.from_name} → {edge.to_name}
                      </Typography>
                      {edge.has_verifications && (
                        <Chip
                          label="Has Verifications"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                      {edge.actions && edge.actions.length > 0 && (
                        <Chip
                          label={`${edge.actions.length} actions`}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ component: 'div' }}
                />
                <ListItemSecondaryAction>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleEdgeToggle(edgeId)}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={handleRunValidation}
          disabled={selectedCount === 0}
        >
          Run
        </Button>
      </DialogActions>
    </Dialog>
  );
}
