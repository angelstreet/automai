import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import React from 'react';

interface EdgeInfo {
  tree_name: string;
}

interface ActionDependencyDialogProps {
  isOpen: boolean;
  edges: EdgeInfo[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ActionDependencyDialog: React.FC<ActionDependencyDialogProps> = ({
  isOpen,
  edges,
  onConfirm,
  onCancel,
}) => {
  const edgeCount = edges.length;
  const displayEdges = edges.slice(0, 3);
  const hasMore = edges.length > 3;

  return (
    <Dialog open={isOpen} onClose={onCancel}>
      <DialogTitle>Action Used by {edgeCount} Edges</DialogTitle>
      <DialogContent>
        <Typography>
          {displayEdges.map((edge) => edge.tree_name).join(', ')}
          {hasMore && ' ...'}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}>Continue</Button>
      </DialogActions>
    </Dialog>
  );
};
