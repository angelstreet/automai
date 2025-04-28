'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';

export function ReportActionsClient() {
  const t = useTranslations('reports');

  // Get Grafana URL from environment, falling back to the known URL
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'https://automai.grafana.net';

  const handleOpenGrafana = () => {
    console.log('[@component:ReportActionsClient] Opening Grafana in new window');
    window.open(grafanaUrl, '_blank');
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      <Button
        size="sm"
        className="h-8 gap-1"
        variant="outline"
        onClick={handleOpenGrafana}
        id="open-grafana-button"
      >
        <ExternalLink className="h-4 w-4" />
        <span>Grafana</span>
      </Button>
    </div>
  );
}
