'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

interface JobRunOutputDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobRun: any | null;
}

export function JobRunOutputDialogClient({
  open,
  onOpenChange,
  jobRun,
}: JobRunOutputDialogClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');

  // Extract stdout content from job output
  const getStdoutContent = (output: any) => {
    if (!output) return 'No output available';
    if (typeof output === 'string') return output;
    if (output.stdout) return output.stdout;
    return JSON.stringify(output, null, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col p-4">
        <DialogHeader>
          <DialogTitle>
            {t('job_run_details')} #{jobRun?.executionNumber || '-'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col mt-[-8px]">
          <div className="bg-black/90 text-green-400 rounded font-mono text-xs whitespace-pre-wrap overflow-auto max-h-[60vh]">
            {jobRun ? getStdoutContent(jobRun.output) : 'No output available'}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <div>
              <span className="font-semibold">{c('status')}: </span>
              <span
                className={
                  jobRun?.status === 'success'
                    ? 'text-green-500'
                    : jobRun?.status === 'failed'
                      ? 'text-red-500'
                      : 'text-yellow-500'
                }
              >
                {jobRun?.status}
              </span>
            </div>
            <div>
              <span className="font-semibold">{c('started')}: </span>
              {jobRun?.startedAt ? new Date(jobRun.startedAt).toLocaleString() : 'N/A'}
            </div>
            <div>
              <span className="font-semibold">{c('completed')}: </span>
              {jobRun?.completedAt ? new Date(jobRun.completedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
