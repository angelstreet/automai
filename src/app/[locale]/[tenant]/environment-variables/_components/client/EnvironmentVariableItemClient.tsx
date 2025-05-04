'use client';

import { Copy, Trash, Eye, EyeOff, Edit, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateEnvironmentVariable } from '@/app/actions/environmentVariablesAction';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { TableRow, TableCell } from '@/components/shadcn/table';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

import { EnvironmentVariableDeleteDialogClient } from './EnvironmentVariableDeleteDialogClient';

interface EnvironmentVariableItemClientProps {
  variable: EnvironmentVariable;
  onVariableUpdated?: (variable: EnvironmentVariable) => void;
  onVariableDeleted: (id: string) => void;
}

export function EnvironmentVariableItemClient({
  variable,
  onVariableUpdated,
  onVariableDeleted,
}: EnvironmentVariableItemClientProps) {
  const t = useTranslations('environmentVariables');
  const c = useTranslations('common');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isValueVisible, setIsValueVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedKey, setEditedKey] = useState(variable.key);
  const [editedValue, setEditedValue] = useState(variable.value);
  const [editedIsShared, setEditedIsShared] = useState(variable.isShared);
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyValue = async () => {
    try {
      await navigator.clipboard.writeText(variable.value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy value:', err);
    }
  };

  const toggleValueVisibility = () => {
    setIsValueVisible(!isValueVisible);
  };

  const displayValue = () => {
    if (isValueVisible) return variable.value;
    return '••••••••••••';
  };

  const handleEdit = () => {
    if (!isEditing) {
      // Start editing
      setIsEditing(true);
      setEditedKey(variable.key);
      setEditedValue(variable.value);
      setEditedIsShared(variable.isShared);
    } else {
      // Save changes
      saveChanges();
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditedKey(variable.key);
    setEditedValue(variable.value);
    setEditedIsShared(variable.isShared);
  };

  const saveChanges = async () => {
    // Validate key
    if (!editedKey.trim()) {
      toast.error(t('key_required'));
      return;
    }

    if (!editedKey.match(/^[A-Za-z0-9_]+$/)) {
      toast.error(t('key_validation'));
      return;
    }

    setIsSaving(true);

    try {
      // Update variable in database
      const result = await updateEnvironmentVariable(variable.id, {
        key: editedKey,
        value: editedValue,
        description: variable.description || '',
        isShared: editedIsShared,
      });

      if (result.success && result.data) {
        toast.success(t('update_success'));

        // Update local state via parent component
        if (onVariableUpdated) {
          onVariableUpdated(result.data);
        }

        setIsEditing(false);
      } else {
        toast.error(result.error || t('error_update'));
      }
    } catch (error) {
      console.error('Error updating environment variable:', error);
      toast.error(t('error_update'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          {isEditing ? (
            <Input
              value={editedKey}
              onChange={(e) => setEditedKey(e.target.value)}
              className="h-6 font-mono text-xs"
              disabled={isSaving}
            />
          ) : (
            <span className="font-mono text-xs">{variable.key}</span>
          )}
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              type={isValueVisible ? 'text' : 'password'}
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="h-6 font-mono text-xs"
              disabled={isSaving}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground text-xs">{displayValue()}</span>
            </div>
          )}
        </TableCell>
        <TableCell className="text-center">
          <input
            type="checkbox"
            checked={isEditing ? editedIsShared : variable.isShared}
            disabled={!isEditing || isSaving}
            className="w-3 h-3"
            onChange={() => isEditing && setEditedIsShared(!editedIsShared)}
          />
        </TableCell>
        <TableCell className="text-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleValueVisibility}
            title={isValueVisible ? t('hide_value') : t('show_value')}
            className="h-5 w-5"
            disabled={isSaving}
          >
            {isValueVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </TableCell>
        <TableCell className="text-center w-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyValue}
            title={isCopied ? c('copied') : c('copy')}
            className="h-5 w-5"
            disabled={isSaving || isEditing}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </TableCell>
        <TableCell className="text-center w-12">
          {isEditing ? (
            <div className="flex justify-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelEdit}
                title={c('cancel')}
                className="h-5 w-5"
                disabled={isSaving}
              >
                <X className="h-3 w-3 text-red-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                title={c('save')}
                className="h-5 w-5"
                disabled={isSaving}
              >
                <Check className="h-3 w-3 text-green-500" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              title={c('edit')}
              className="h-5 w-5"
              disabled={isSaving}
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </TableCell>
        <TableCell className="text-center w-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDeleteDialogOpen(true)}
            title={c('delete')}
            className="h-5 w-5"
            disabled={isSaving || isEditing}
          >
            <Trash className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>

      <EnvironmentVariableDeleteDialogClient
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        variable={variable}
        onVariableDeleted={onVariableDeleted}
      />
    </>
  );
}
