import { Add as AddIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import { Host } from '../../types/common/Host_Types';
import type { Actions, Action, EdgeAction } from '../../types/controller/Action_Types';

import { ActionItem } from './ActionItem';

export interface ActionsListProps {
  actions: EdgeAction[];
  retryActions: EdgeAction[];
  finalWaitTime: number;
  availableActionTypes: Actions;
  onActionsChange: (actions: EdgeAction[]) => void;
  onRetryActionsChange: (retryActions: EdgeAction[]) => void;
  onFinalWaitTimeChange: (waitTime: number) => void;
  loading?: boolean;
  error?: string | null;
  selectedHost: Host | null;
  onTest?: () => void;
  testResults?: EdgeAction[];
  showCollapsible?: boolean;
  title?: string;
}

export const ActionsList: React.FC<ActionsListProps> = React.memo(
  ({
    actions,
    retryActions,
    availableActionTypes = {},
    onActionsChange,
    onRetryActionsChange,
    loading = false,
    error = null,
    selectedHost,
    onTest,
    testResults = [],
    showCollapsible = false,
    title = 'Actions',
  }) => {
    const [passCondition, setPassCondition] = useState<'all' | 'any'>('all');
    const [collapsed, setCollapsed] = useState<boolean>(false);

    console.log(
      `[@component:ActionsList] Using available actions for ${selectedHost?.device_model}:`,
      Object.keys(availableActionTypes).length,
      'action categories',
    );

    const addAction = useCallback(() => {
      const newAction: EdgeAction = {
        id: '',
        label: '',
        command: '',
        params: {},
        requiresInput: false,
        inputValue: '',
        waitTime: 2000,
      };
      onActionsChange([...actions, newAction]);
    }, [actions, onActionsChange]);

    const addRetryAction = useCallback(() => {
      const newAction: EdgeAction = {
        id: '',
        label: '',
        command: '',
        params: {},
        requiresInput: false,
        inputValue: '',
        waitTime: 2000,
      };
      onRetryActionsChange([...retryActions, newAction]);
    }, [retryActions, onRetryActionsChange]);

    const removeAction = useCallback(
      (index: number) => {
        const newActions = actions.filter((_, i) => i !== index);
        onActionsChange(newActions);
      },
      [actions, onActionsChange],
    );

    const removeRetryAction = useCallback(
      (index: number) => {
        const newRetryActions = retryActions.filter((_, i) => i !== index);
        onRetryActionsChange(newRetryActions);
      },
      [retryActions, onRetryActionsChange],
    );

    const updateAction = useCallback(
      (index: number, updates: Partial<EdgeAction>) => {
        const newActions = actions.map((action, i) =>
          i === index ? { ...action, ...updates } : action,
        );
        onActionsChange(newActions);
      },
      [actions, onActionsChange],
    );

    const updateRetryAction = useCallback(
      (index: number, updates: Partial<EdgeAction>) => {
        const newRetryActions = retryActions.map((action, i) =>
          i === index ? { ...action, ...updates } : action,
        );
        onRetryActionsChange(newRetryActions);
      },
      [retryActions, onRetryActionsChange],
    );

    const moveActionUp = useCallback(
      (index: number) => {
        if (index === 0) return;
        const newActions = [...actions];
        [newActions[index - 1], newActions[index]] = [newActions[index], newActions[index - 1]];
        onActionsChange(newActions);
      },
      [actions, onActionsChange],
    );

    const moveActionDown = useCallback(
      (index: number) => {
        if (index === actions.length - 1) return;
        const newActions = [...actions];
        [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
        onActionsChange(newActions);
      },
      [actions, onActionsChange],
    );

    const moveRetryActionUp = useCallback(
      (index: number) => {
        if (index === 0) return;
        const newRetryActions = [...retryActions];
        [newRetryActions[index - 1], newRetryActions[index]] = [
          newRetryActions[index],
          newRetryActions[index - 1],
        ];
        onRetryActionsChange(newRetryActions);
      },
      [retryActions, onRetryActionsChange],
    );

    const moveRetryActionDown = useCallback(
      (index: number) => {
        if (index === retryActions.length - 1) return;
        const newRetryActions = [...retryActions];
        [newRetryActions[index], newRetryActions[index + 1]] = [
          newRetryActions[index + 1],
          newRetryActions[index],
        ];
        onRetryActionsChange(newRetryActions);
      },
      [retryActions, onRetryActionsChange],
    );

    const handleActionSelect = useCallback(
      (index: number, actionCommand: string, isRetry: boolean = false) => {
        // Find the selected action from available actions
        let selectedAction: Action | undefined;

        // Search through all action categories to find the action by command
        for (const [category, categoryData] of Object.entries(availableActionTypes)) {
          let actionList: Action[] = [];

          if (Array.isArray(categoryData)) {
            // Direct array (flat structure)
            actionList = categoryData;
          } else if (categoryData && typeof categoryData === 'object') {
            // Nested structure - get the array from the nested object
            const nestedActions = categoryData[category];
            if (Array.isArray(nestedActions)) {
              actionList = nestedActions;
            }
          }

          const action = actionList.find((a) => a.command === actionCommand);
          if (action) {
            selectedAction = action;
            break;
          }
        }

        if (selectedAction) {
          const updates = {
            id: selectedAction.id,
            label: selectedAction.label,
            command: selectedAction.command,
            params: { ...selectedAction.params },
            requiresInput: selectedAction.requiresInput,
            inputValue: '',
          };

          if (isRetry) {
            updateRetryAction(index, updates);
          } else {
            updateAction(index, updates);
          }
        }
      },
      [availableActionTypes, updateAction, updateRetryAction],
    );

    // Check if all actions have required inputs
    const areActionsValid = useCallback(() => {
      if (actions.length === 0) return false;

      return actions.every((action) => {
        // Skip actions that don't have a command (not configured yet)
        if (!action.command) return true;

        if (action.requiresInput) {
          const hasInputValue =
            action.inputValue &&
            typeof action.inputValue === 'string' &&
            action.inputValue.trim() !== '';
          return Boolean(hasInputValue);
        }

        return true;
      });
    }, [actions]);

    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
          <CircularProgress size={20} />
          <Typography>Running actions...</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    const renderActionSection = (
      sectionTitle: string,
      actionsList: EdgeAction[],
      onAdd: () => void,
      onRemove: (index: number) => void,
      onUpdate: (index: number, updates: Partial<EdgeAction>) => void,
      onMoveUp: (index: number) => void,
      onMoveDown: (index: number) => void,
      isRetry: boolean = false,
    ) => (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {sectionTitle}
            {isRetry && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (executes if main actions fail)
              </Typography>
            )}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{ minWidth: 'auto' }}
          >
            Add
          </Button>
        </Box>

        <Box sx={{ mb: 1 }}>
          {actionsList.map((action, index) => (
            <ActionItem
              key={index}
              action={action}
              index={index}
              availableActionTypes={availableActionTypes}
              testResult={testResults[isRetry ? actions.length + index : index]}
              onActionSelect={(idx, command) => handleActionSelect(idx, command, isRetry)}
              onUpdateAction={onUpdate}
              onRemoveAction={onRemove}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              canMoveUp={index > 0}
              canMoveDown={index < actionsList.length - 1}
            />
          ))}
        </Box>
      </Box>
    );

    const content = (
      <>
        {/* Main Actions Section */}
        {renderActionSection(
          'Main Actions',
          actions,
          addAction,
          removeAction,
          updateAction,
          moveActionUp,
          moveActionDown,
          false,
        )}

        {/* Retry Actions Section */}
        {renderActionSection(
          'Retry Actions',
          retryActions,
          addRetryAction,
          removeRetryAction,
          updateRetryAction,
          moveRetryActionUp,
          moveRetryActionDown,
          true,
        )}

        {/* Final Wait Time */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
          <FormControl size="small" sx={{ minWidth: 100, mr: 1 }}>
            <Select
              value={passCondition}
              onChange={(e) => setPassCondition(e.target.value as 'all' | 'any')}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: '30px',
                '& .MuiSelect-select': {
                  padding: '5px 10px',
                },
              }}
            >
              <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>
                All must succeed
              </MenuItem>
              <MenuItem value="any" sx={{ fontSize: '0.75rem' }}>
                Any can succeed
              </MenuItem>
            </Select>
          </FormControl>

          {onTest && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PlayIcon />}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTest?.();
              }}
              disabled={!areActionsValid()}
              sx={{
                minWidth: 'auto',
                ml: 1,
                borderColor: '#444',
                color: 'inherit',
                fontSize: '0.75rem',
                '&:hover': {
                  borderColor: '#666',
                },
                '&:disabled': {
                  borderColor: '#333',
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              Test
            </Button>
          )}
        </Box>

        {/* Final Result indicator */}
        {testResults.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 2,
              p: 1,
              borderRadius: 1,
              backgroundColor:
                passCondition === 'all'
                  ? testResults.every((result) => result.success || result.resultType === 'SUCCESS')
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(244, 67, 54, 0.1)'
                  : testResults.some((result) => result.success || result.resultType === 'SUCCESS')
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(244, 67, 54, 0.1)',
              border: `1px solid ${
                passCondition === 'all'
                  ? testResults.every((result) => result.success || result.resultType === 'SUCCESS')
                    ? '#4caf50'
                    : '#f44336'
                  : testResults.some((result) => result.success || result.resultType === 'SUCCESS')
                    ? '#4caf50'
                    : '#f44336'
              }`,
            }}
          >
            <Typography
              sx={{
                fontWeight: 'bold',
                color:
                  passCondition === 'all'
                    ? testResults.every(
                        (result) => result.success || result.resultType === 'SUCCESS',
                      )
                      ? '#4caf50'
                      : '#f44336'
                    : testResults.some(
                          (result) => result.success || result.resultType === 'SUCCESS',
                        )
                      ? '#4caf50'
                      : '#f44336',
              }}
            >
              Final Result:{' '}
              {passCondition === 'all'
                ? testResults.every((result) => result.success || result.resultType === 'SUCCESS')
                  ? 'SUCCESS'
                  : 'FAILED'
                : testResults.some((result) => result.success || result.resultType === 'SUCCESS')
                  ? 'SUCCESS'
                  : 'FAILED'}
            </Typography>
          </Box>
        )}
      </>
    );

    // If collapsible is requested, wrap in collapsible container
    if (showCollapsible) {
      return (
        <Box>
          {/* Collapsible toggle button and title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Button
              size="small"
              onClick={() => setCollapsed(!collapsed)}
              sx={{ p: 0.25, minWidth: 'auto' }}
            >
              {collapsed ? '▶' : '▼'}
            </Button>
            <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>

          {/* Collapsible content */}
          {!collapsed && (
            <Box
              sx={{
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
              }}
            >
              {content}
            </Box>
          )}
        </Box>
      );
    }

    // Otherwise return content directly
    return <Box>{content}</Box>;
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    const actionsChanged = JSON.stringify(prevProps.actions) !== JSON.stringify(nextProps.actions);
    const retryActionsChanged =
      JSON.stringify(prevProps.retryActions) !== JSON.stringify(nextProps.retryActions);
    const availableActionTypesChanged =
      JSON.stringify(prevProps.availableActionTypes) !==
      JSON.stringify(nextProps.availableActionTypes);
    const loadingChanged = prevProps.loading !== nextProps.loading;
    const errorChanged = prevProps.error !== nextProps.error;
    const selectedHostChanged =
      JSON.stringify(prevProps.selectedHost) !== JSON.stringify(nextProps.selectedHost);
    const testResultsChanged =
      JSON.stringify(prevProps.testResults) !== JSON.stringify(nextProps.testResults);
    const showCollapsibleChanged = prevProps.showCollapsible !== nextProps.showCollapsible;
    const titleChanged = prevProps.title !== nextProps.title;

    // Function references
    const onActionsChangeChanged = prevProps.onActionsChange !== nextProps.onActionsChange;
    const onRetryActionsChangeChanged =
      prevProps.onRetryActionsChange !== nextProps.onRetryActionsChange;
    const onFinalWaitTimeChangeChanged =
      prevProps.onFinalWaitTimeChange !== nextProps.onFinalWaitTimeChange;
    const onTestChanged = prevProps.onTest !== nextProps.onTest;

    // Only re-render if meaningful props have changed
    const shouldRerender =
      actionsChanged ||
      retryActionsChanged ||
      availableActionTypesChanged ||
      loadingChanged ||
      errorChanged ||
      selectedHostChanged ||
      testResultsChanged ||
      showCollapsibleChanged ||
      titleChanged ||
      onActionsChangeChanged ||
      onRetryActionsChangeChanged ||
      onFinalWaitTimeChangeChanged ||
      onTestChanged;

    if (shouldRerender) {
      console.log('[@component:ActionsList] Props changed, re-rendering:', {
        actionsChanged,
        retryActionsChanged,
        availableActionTypesChanged,
        loadingChanged,
        errorChanged,
        selectedHostChanged,
        testResultsChanged,
        showCollapsibleChanged,
        titleChanged,
        onActionsChangeChanged,
        onRetryActionsChangeChanged,
        onFinalWaitTimeChangeChanged,
        onTestChanged,
      });
    }

    return !shouldRerender; // Return true to skip re-render, false to re-render
  },
);
