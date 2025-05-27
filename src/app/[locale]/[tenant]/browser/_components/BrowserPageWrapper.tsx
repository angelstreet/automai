'use client';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import { BrowserAutomationProvider } from '@/context';
import { Host } from '@/types/component/hostComponentType';
import { User } from '@/types/service/userServiceType';

import BrowserContent from './BrowserContent';
import { BrowserActionsClient } from './client/BrowserActionsClient';

interface BrowserPageWrapperProps {
  title: string;
  description: string;
  hosts: Host[];
  currentUser: User;
}

export default function BrowserPageWrapper({
  title,
  description,
  hosts,
  currentUser,
}: BrowserPageWrapperProps) {
  return (
    <BrowserAutomationProvider>
      <FeaturePageContainer
        title={title}
        description={description}
        actions={<BrowserActionsClient initialHosts={hosts} currentUser={currentUser} />}
      >
        <BrowserContent />
      </FeaturePageContainer>
    </BrowserAutomationProvider>
  );
}
