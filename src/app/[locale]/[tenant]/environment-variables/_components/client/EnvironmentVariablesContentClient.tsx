'use client';

import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

import { EnvironmentVariablesEventListenerClient } from './EnvironmentVariablesEventListenerClient';
import { EnvironmentVariablesListClient } from './EnvironmentVariablesListClient';
import { VercelStyleEnvEditor } from './VercelStyleEnvEditor';

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

  const handleVariablesCreated = (newVariables: EnvironmentVariable[]) => {
    setVariables((prev) => [...prev, ...newVariables]);
  };

  return (
    <>
      {variables.length === 0 ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <KeyRound className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">{t('none_title')}</h3>
            <p className="mt-1 text-sm text-muted-foreground mb-6">{t('none_desc')}</p>
          </div>
          <VercelStyleEnvEditor teamId={teamId} onVariablesCreated={handleVariablesCreated} />
        </div>
      ) : (
        <div className="space-y-6">
          <EnvironmentVariablesListClient
            variables={variables}
            onVariableDeleted={(id) => {
              setVariables((prev) => prev.filter((v) => v.id !== id));
            }}
          />
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Add New Variables</h3>
            <VercelStyleEnvEditor teamId={teamId} onVariablesCreated={handleVariablesCreated} />
          </div>
        </div>
      )}

      <EnvironmentVariablesEventListenerClient
        teamId={teamId}
        onVariablesRefreshed={setVariables}
      />
    </>
  );
}
