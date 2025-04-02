'use client';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

// Simple component that doesn't need to handle pageMetadata internally
function DevicesContent() {
  return (
    <div className="container mx-auto p-4">
      <p>This page is under construction.</p>
    </div>
  );
}

export default function DevicesPage() {
  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer
      title="Devices"
      description="Manage your connected devices"
    >
      <DevicesContent />
    </FeaturePageContainer>
  );
}
