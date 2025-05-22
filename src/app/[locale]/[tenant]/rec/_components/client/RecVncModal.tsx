'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

interface RecVncModalProps {
  host: Host;
  isOpen: boolean;
  onClose: () => void;
}

export function RecVncModal({ host, isOpen, onClose }: RecVncModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Handle escape key press to close the modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get VNC connection details
  const vnc_port = host?.vnc_port;
  const vnc_password = host?.vnc_password;

  // If VNC not configured
  if (!vnc_port) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
        <div className="w-11/12 h-5/6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
          <div className="p-2 bg-gray-800 text-white flex justify-between items-center rounded-t-lg">
            <h2 className="text-lg font-medium">{host.name || host.ip} - VNC Connection</h2>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white focus:outline-none"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">VNC not configured for this host</p>
          </div>
        </div>
      </div>
    );
  }

  // VNC URL format with password param if available
  const vncUrl = `http://${host.ip}:${vnc_port}/vnc.html?host=${host.ip}&port=${vnc_port}&path=websockify&encrypt=0${vnc_password ? `&password=${vnc_password}` : ''}`;

  // Try to auto-login with JavaScript if password is available
  const autoLoginScript = vnc_password
    ? `
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          // Try to find password field and auto-submit
          var passwordInput = document.querySelector('input[type="password"]');
          if (passwordInput) {
            passwordInput.value = "${vnc_password}";
            var submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) submitButton.click();
          }
        }, 1000);
      });
    </script>
  `
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="w-11/12 h-5/6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-2 bg-gray-800 text-white flex justify-between items-center rounded-t-lg">
          <h2 className="text-lg font-medium">{host.name || host.ip} - VNC Connection</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white focus:outline-none"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* VNC Viewer */}
        <div className="flex-1 relative">
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="mt-2 text-gray-500">Connecting to VNC...</span>
              </div>
            </div>
          )}

          {/* VNC iframe */}
          <iframe
            src={vncUrl}
            className="w-full h-full"
            style={{ border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onLoad={handleIframeLoad}
            title={`VNC Stream - ${host.name || host.ip}`}
            srcDoc={
              autoLoginScript
                ? `<!DOCTYPE html><html><head>${autoLoginScript}</head><body><iframe src="${vncUrl}" style="width:100%;height:100%;border:none;"></iframe></body></html>`
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
