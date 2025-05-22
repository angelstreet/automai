'use client';

import { useEffect, useRef, useState } from 'react';

interface RecStreamPreviewProps {
  streamUrl: string;
  title: string;
  onClick?: () => void;
}

export function RecStreamPreview({ streamUrl, title, onClick }: RecStreamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: any;

    async function setupStream() {
      try {
        const HLS = (await import('hls.js')).default;

        if (videoRef.current) {
          if (HLS.isSupported()) {
            console.log('[@component:RecStreamPreview] Setting up HLS stream:', streamUrl);

            hls = new HLS({
              enableWorker: true,
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);

            hls.on(HLS.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              videoRef.current?.play().catch((err) => {
                console.error('[@component:RecStreamPreview] Autoplay failed:', err);
              });
            });

            hls.on(HLS.Events.ERROR, (_: any, data: any) => {
              if (data.fatal) {
                setError(`Stream error: ${data.type}`);
                console.error('[@component:RecStreamPreview] Fatal error:', data);
                hls.destroy();
              }
            });
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // For browsers that natively support HLS (Safari)
            videoRef.current.src = streamUrl;
            videoRef.current.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
              videoRef.current?.play().catch((err) => {
                console.error('[@component:RecStreamPreview] Autoplay failed:', err);
              });
            });
          } else {
            setError('HLS is not supported in this browser');
          }
        }
      } catch (err) {
        console.error('[@component:RecStreamPreview] Failed to setup HLS:', err);
        setError('Failed to load video player');
      }
    }

    setupStream();

    return () => {
      // Cleanup
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
      style={{ height: '160px' }}
      onClick={handleClick}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-xs text-gray-500">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="text-red-500 text-center p-2">
            <p className="font-medium">Stream Error</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Video Stream */}
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

      {/* Transparent overlay to capture clicks */}
      <div className="absolute inset-0 z-10" aria-hidden="true" />

      {/* Stream info footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-1 text-xs z-20">
        <div className="flex justify-between items-center">
          <span>{title}</span>
          <span className="text-green-400">LIVE</span>
        </div>
      </div>
    </div>
  );
}
