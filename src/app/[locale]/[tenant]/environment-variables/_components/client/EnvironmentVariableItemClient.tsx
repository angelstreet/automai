'use client';

import { Copy, Trash, Eye, EyeOff, Edit } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

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
  onVariableUpdated,
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
    if (isValueVisible) return variable.value;
    return '••••••••••••';
  };

  const handleEdit = () => {
    console.log(`[@component:EnvironmentVariableItemClient] Editing variable: ${variable.key}`);

    if (onVariableUpdated) {
      // This would be called after a successful edit
      // onVariableUpdated(updatedVariable);
    }
  };

  return (
    <>
      <TableRow className="h-9">
        <TableCell className="font-mono py-1.5">{variable.key}</TableCell>
        <TableCell className="py-1.5">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-muted-foreground`}>{displayValue()}</span>
          </div>
        </TableCell>
        <TableCell className="text-center py-1.5 w-24">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleValueVisibility}
            title={isValueVisible ? t('hide_value') : t('show_value')}
            className="h-6 w-6"
          >
            {isValueVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
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
            onClick={handleEdit}
            title={c('edit')}
            className="h-6 w-6"
          >
            <Edit className="h-3.5 w-3.5" />
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
