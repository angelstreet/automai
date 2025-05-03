'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteEnvironmentVariable } from '@/app/actions/environmentVariablesAction';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/shadcn/alert-dialog';
import { Button } from '@/components/shadcn/button';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

interface EnvironmentVariableDeleteDialogClientProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  variable: EnvironmentVariable;
  onVariableDeleted: (id: string) => void;
}

export function EnvironmentVariableDeleteDialogClient({
  isOpen,
  onOpenChange,
  variable,
  onVariableDeleted,
}: EnvironmentVariableDeleteDialogClientProps) {
  const t = useTranslations('environmentVariables');
  const c = useTranslations('common');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteEnvironmentVariable(variable.id);

      if (result.success) {
        toast.success(`${variable.key} ${t('deleted_successfully')}`);
        onVariableDeleted(variable.id);
        onOpenChange(false);
      } else {
        toast.error(result.error || t('unknown_error'));
      }
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error(error instanceof Error ? error.message : t('unknown_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t('confirm_delete_title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{t('confirm_delete')}</p>

            <p className="text-destructive">{t('delete_warning')}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{c('cancel')}</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? c('deleting') : c('delete')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
