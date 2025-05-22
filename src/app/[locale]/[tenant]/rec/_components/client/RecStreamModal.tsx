'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface RecStreamModalProps {
  streamUrl: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RecStreamModal({ streamUrl, title, isOpen, onClose }: RecStreamModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: any;

    async function setupStream() {
      try {
        // Only setup the stream if the modal is open
        if (!isOpen) return;

        const HLS = (await import('hls.js')).default;

        if (videoRef.current) {
          if (HLS.isSupported()) {
            console.log('[@component:RecStreamModal] Setting up HLS stream:', streamUrl);

            hls = new HLS({
              enableWorker: true,
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);

            hls.on(HLS.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              videoRef.current?.play().catch((err) => {
                console.error('[@component:RecStreamModal] Autoplay failed:', err);
              });
            });

            hls.on(HLS.Events.ERROR, (_: any, data: any) => {
              if (data.fatal) {
                setError(`Stream error: ${data.type}`);
                console.error('[@component:RecStreamModal] Fatal error:', data);
                hls.destroy();
              }
            });
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // For browsers that natively support HLS (Safari)
            videoRef.current.src = streamUrl;
            videoRef.current.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
              videoRef.current?.play().catch((err) => {
                console.error('[@component:RecStreamModal] Autoplay failed:', err);
              });
            });
          } else {
            setError('HLS is not supported in this browser');
          }
        }
      } catch (err) {
        console.error('[@component:RecStreamModal] Failed to setup HLS:', err);
        setError('Failed to load video player');
      }
    }

    setupStream();

    // Handle escape key press to close the modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      // Cleanup
      if (hls) {
        hls.destroy();
      }
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, streamUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="w-[95vw] h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-2 bg-gray-800 text-white flex justify-between items-center rounded-t-lg">
          <h2 className="text-lg font-medium">{title} - Live Stream</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white focus:outline-none"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stream Viewer */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="mt-2 text-gray-500">Connecting to stream...</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <div className="text-red-500 text-center p-4">
                <p className="font-medium">Stream Error</p>
                <p>{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Video Stream */}
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            autoPlay
            style={{ backgroundColor: 'black' }}
          />
        </div>
      </div>
    </div>
  );
}
