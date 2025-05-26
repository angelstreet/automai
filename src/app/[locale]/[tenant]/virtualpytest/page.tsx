import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import VirtualpytestContent from './_components/VirtualpytestContent';

export default async function VirtualPyTestPage() {
  return (
    <FeaturePageContainer className="overflow-hidden">
      <div className="h-full w-full overflow-hidden">
        <VirtualpytestContent />
      </div>
    </FeaturePageContainer>
  );
}
