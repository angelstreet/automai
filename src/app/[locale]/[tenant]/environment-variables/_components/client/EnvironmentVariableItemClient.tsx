'use client';

import { Copy, Trash, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
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
      <TableRow>
        <TableCell className="font-mono">{variable.key}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className={`font-mono ${variable.is_secret ? 'text-muted-foreground' : ''}`}>
              {displayValue()}
            </span>
            {variable.is_secret && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleValueVisibility}
                title={isValueVisible ? t('hide_value') : t('show_value')}
              >
                {isValueVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyValue}
              title={isCopied ? t('copied') : t('copy_value')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
        <TableCell>{variable.description || '-'}</TableCell>
        <TableCell className="text-center">
          {variable.is_secret ? <Badge variant="secondary">{t('is_secret')}</Badge> : '-'}
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              title={t('delete')}
            >
              <Trash className="h-4 w-4" />
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
