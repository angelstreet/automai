'use client';

import { Copy, Trash, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

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
  onVariableDeleted,
}: EnvironmentVariableItemClientProps) {
  const t = useTranslations('environmentVariables');
  const c = useTranslations('common');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isValueVisible, setIsValueVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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
    if (!variable.is_secret) return variable.value;
    if (isValueVisible) return variable.value;
    return t('secret_value_masked');
  };

  return (
    <>
      <TableRow className="h-9">
        <TableCell className="font-mono py-1.5">{variable.key}</TableCell>
        <TableCell className="py-1.5">
          <div className="flex items-center gap-1">
            <span
              className={`font-mono ${variable.is_secret ? 'text-muted-foreground' : ''} truncate max-w-[200px]`}
            >
              {displayValue()}
            </span>
            {variable.is_secret && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleValueVisibility}
                title={isValueVisible ? t('hide_value') : t('show_value')}
                className="h-6 w-6 ml-0.5"
              >
                {isValueVisible ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyValue}
              title={isCopied ? t('copied') : t('copy_value')}
              className="h-6 w-6"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
        <TableCell className="text-center py-1.5 w-24">
          <Switch
            className="data-[state=checked]:bg-primary scale-75"
            checked={variable.is_secret}
            disabled
          />
        </TableCell>
        <TableCell className="py-1.5">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              title={c('delete')}
              className="h-6 w-6"
            >
              <Trash className="h-3.5 w-3.5" />
            </Button>
          </div>
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
