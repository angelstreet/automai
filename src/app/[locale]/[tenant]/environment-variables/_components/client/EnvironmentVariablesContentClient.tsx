'use client';

import { Plus, KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

import { EnvironmentVariableDialogClient } from './EnvironmentVariableDialogClient';
import { EnvironmentVariablesEventListenerClient } from './EnvironmentVariablesEventListenerClient';
import { EnvironmentVariablesListClient } from './EnvironmentVariablesListClient';

interface EnvironmentVariablesContentClientProps {
  initialData: EnvironmentVariable[];
  teamId: string;
}

export function EnvironmentVariablesContentClient({
  initialData,
  teamId,
}: EnvironmentVariablesContentClientProps) {
  const t = useTranslations('environmentVariables');
  const [variables, setVariables] = useState<EnvironmentVariable[]>(initialData);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleVariableCreated = (newVariable: EnvironmentVariable) => {
    setVariables((prev) => [...prev, newVariable]);
  };

  const handleVariableUpdated = (updatedVariable: EnvironmentVariable) => {
    setVariables((prev) =>
      prev.map((variable) => (variable.id === updatedVariable.id ? updatedVariable : variable)),
    );
  };

  const handleVariableDeleted = (variableId: string) => {
    setVariables((prev) => prev.filter((variable) => variable.id !== variableId));
  };

  return (
    <>
      <div className="flex justify-end items-center mb-4">
        <Button onClick={openCreateDialog} size="sm" className="h-8 gap-1">
          <Plus className="h-4 w-4" />
          {t('add_button')}
        </Button>
      </div>

      {variables.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <KeyRound className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">{t('none_title')}</h3>
          <p className="mt-1 text-sm text-muted-foreground mb-4">{t('none_desc')}</p>
          <Button onClick={openCreateDialog} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            {t('add_button')}
          </Button>
        </div>
      ) : (
        <EnvironmentVariablesListClient
          variables={variables}
          onVariableUpdated={handleVariableUpdated}
          onVariableDeleted={handleVariableDeleted}
        />
      )}

      <EnvironmentVariableDialogClient
        teamId={teamId}
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onVariableCreated={handleVariableCreated}
      />

      <EnvironmentVariablesEventListenerClient
        teamId={teamId}
        onVariablesRefreshed={setVariables}
      />
    </>
  );
}
