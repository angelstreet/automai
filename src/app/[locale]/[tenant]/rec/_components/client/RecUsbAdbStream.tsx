'use client';

import { useState } from 'react';

import { RecStreamPreview } from './RecStreamPreview';
import { RecStreamModal } from './RecStreamModal';

interface RecUsbAdbStreamProps {
  hostId: string;
  mobileName?: string;
}

export function RecUsbAdbStream({ hostId, mobileName = 'Android Device' }: RecUsbAdbStreamProps) {
  const [showStream, setShowStream] = useState(false);

  // Hardcoded values as per requirements
  const streamUrl = 'https://77.56.53.130:444/stream/output.m3u8';
  const deviceId = '192.168.1.29';

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
