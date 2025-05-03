'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

import { EnvironmentVariablesEmptyState } from '../EnvironmentVariablesEmptyState';

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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('add_button')}
        </Button>
      </div>

      {variables.length === 0 ? (
        <EnvironmentVariablesEmptyState onAddClick={openCreateDialog} />
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
