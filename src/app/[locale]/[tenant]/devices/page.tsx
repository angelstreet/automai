'use client';

// Simple component that doesn't need to handle pageMetadata internally
function DevicesContent() {
  return (
    <div className="container mx-auto p-4">
      <p>This page is under construction.</p>
    </div>
  );
}

export default function DevicesPage() {
  // Using pageMetadata pattern - FeaturePageContainer will automatically extract this
  return (
    <DevicesContent 
      pageMetadata={{
        title: 'Devices', 
        description: 'Manage your connected devices'
      }}
    />
  );
}
