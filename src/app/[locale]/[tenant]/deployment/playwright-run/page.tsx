import PlaywrightContent from './_components/playwrightContent';

interface PlaywrightRunProps {
  params: {
    locale: string;
    tenant: string;
  };
  searchParams: {
    jobId?: string;
    configName?: string;
    env?: string;
    hostName?: string;
    hostIp?: string;
    hostPort?: string;
    repository?: string;
    scriptFolder?: string;
    startTime?: string;
    websocketUrl?: string;
  };
}

export default function PlaywrightRun({ params: _params, searchParams }: PlaywrightRunProps) {
  return <PlaywrightContent searchParams={searchParams} />;
}
