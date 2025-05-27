'use client';

import { useState } from 'react';

import { RecStreamModal } from './RecStreamModal';
import { RecStreamPreview } from './RecStreamPreview';

interface RecUsbAdbStreamProps {
  hostId: string;
  mobileName?: string;
  streamUrl?: string;
  deviceId?: string;
}

export function RecUsbAdbStream({
  hostId,
  mobileName = 'Android Device',
  streamUrl = 'https://localhost:444/stream/output.m3u8', // Default fallback
  deviceId = '127.0.0.1', // Default fallback
}: RecUsbAdbStreamProps) {
  const [showStream, setShowStream] = useState(false);

  const handleOpenStream = () => {
    setShowStream(true);
  };

  const handleCloseStream = () => {
    setShowStream(false);
  };

  return (
    <>
      <RecStreamPreview streamUrl={streamUrl} title={mobileName} onClick={handleOpenStream} />

      {showStream && (
        <RecStreamModal
          streamUrl={streamUrl}
          _title={mobileName} // Unused but passed for consistency
          isOpen={showStream}
          onClose={handleCloseStream}
          hostId={hostId}
          deviceId={deviceId}
          remoteType="usbAdb"
        />
      )}
    </>
  );
}
