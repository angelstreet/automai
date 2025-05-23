'use client';

import { useState } from 'react';

import { RecStreamModal } from './RecStreamModal';

interface RecUsbAdbStreamProps {
  hostId: string;
  mobileName?: string;
}

export function RecUsbAdbStream({ hostId, mobileName = 'Android Device' }: RecUsbAdbStreamProps) {
  const [showStream, setShowStream] = useState(false);

  // Hardcoded values as per requirements
  const streamUrl = 'https://77.56.53.130:444/adbstream/output.m3u8';
  const deviceId = '192.168.1.29';

  const handleOpenStream = () => {
    setShowStream(true);
  };

  const handleCloseStream = () => {
    setShowStream(false);
  };

  return (
    <>
      <button
        onClick={handleOpenStream}
        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        View USB Mobile Screen
      </button>

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
