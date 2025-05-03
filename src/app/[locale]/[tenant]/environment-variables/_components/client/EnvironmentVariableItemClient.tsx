'use client';

import { Copy, Trash, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { updateEnvironmentVariable } from '@/app/actions/environmentVariablesAction';
import { Button } from '@/components/shadcn/button';
import { Switch } from '@/components/shadcn/switch';
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
  onVariableUpdated = () => {},
  onVariableDeleted,
}: EnvironmentVariableItemClientProps) {
  const t = useTranslations('environmentVariables');
  const c = useTranslations('common');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isValueVisible, setIsValueVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSecretMode, setIsSecretMode] = useState(variable.is_secret);
  const [isUpdating, setIsUpdating] = useState(false);

  // Make sure the secret state syncs with the variable prop
  useEffect(() => {
    setIsSecretMode(variable.is_secret);
  }, [variable.is_secret]);

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

  const handleToggleSecret = async () => {
    const newSecretMode = !isSecretMode;
    setIsUpdating(true);

    try {
      const result = await updateEnvironmentVariable(variable.id, {
        is_secret: newSecretMode,
      });

      if (result.success && result.data) {
        setIsSecretMode(newSecretMode);
        // If we're turning on secret mode, also hide the value
        if (newSecretMode) {
          setIsValueVisible(false);
        }
        onVariableUpdated(result.data);
        toast.success(t('update_success'));
      } else {
        toast.error(result.error || t('error_update'));
      }
    } catch (error) {
      console.error('Error updating variable:', error);
      toast.error(t('error_update'));
    } finally {
      setIsUpdating(false);
    }
  };

  const displayValue = () => {
    if (!isSecretMode) return variable.value;
    if (isValueVisible) return variable.value;
    return '••••••••••••';
  };

  return (
    <>
      <TableRow className="h-9">
        <TableCell className="font-mono py-1.5">{variable.key}</TableCell>
        <TableCell className="py-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono ${isSecretMode ? 'text-muted-foreground' : ''} truncate max-w-[200px]`}
            >
              {displayValue()}
            </span>
            {isSecretMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleValueVisibility}
                title={isValueVisible ? t('hide_value') : t('show_value')}
                className="h-6 w-6"
              >
                {isValueVisible ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center py-1.5 w-24">
          <Switch
            className="data-[state=checked]:bg-primary scale-75"
            checked={isSecretMode}
            onCheckedChange={handleToggleSecret}
            disabled={isUpdating}
            title={isSecretMode ? t('secret_tooltip') : ''}
          />
        </TableCell>
        <TableCell className="text-center py-1.5 w-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyValue}
            title={isCopied ? c('copied') : c('copy')}
            className="h-6 w-6"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
        <TableCell className="text-center py-1.5 w-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDeleteDialogOpen(true)}
            title={c('delete')}
            className="h-6 w-6"
          >
            <Trash className="h-3.5 w-3.5" />
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
