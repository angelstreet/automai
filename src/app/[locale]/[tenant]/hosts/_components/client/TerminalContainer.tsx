'use client';

import { useEffect, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

import { TerminalModal } from './TerminalModal';

export function TerminalContainer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  useEffect(() => {
    // Import events dynamically to avoid SSR issues
    const setupEventListeners = async () => {
      const { HostsEvents } = await import(
        '@/app/[locale]/[tenant]/hosts/_components/client/HostEventListener'
      );

      const handleOpenTerminal = (event: CustomEvent) => {
        console.log('[@component:TerminalContainer] Opening terminal modal', event.detail);

        if (event.detail?.host) {
          setSelectedHost(event.detail.host);
          setIsModalOpen(true);
        }
      };

      const handleCloseTerminal = () => {
        console.log('[@component:TerminalContainer] Closing terminal modal');
        setIsModalOpen(false);
        setSelectedHost(null);
      };

      // Add event listeners
      window.addEventListener(HostsEvents.OPEN_TERMINAL_MODAL, handleOpenTerminal as EventListener);
      window.addEventListener(HostsEvents.CLOSE_TERMINAL_MODAL, handleCloseTerminal);

      // Cleanup function
      return () => {
        window.removeEventListener(
          HostsEvents.OPEN_TERMINAL_MODAL,
          handleOpenTerminal as EventListener,
        );
        window.removeEventListener(HostsEvents.CLOSE_TERMINAL_MODAL, handleCloseTerminal);
      };
    };

    const cleanup = setupEventListeners();

    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
  }, []);

  const handleCloseModal = () => {
    console.log('[@component:TerminalContainer] Modal close requested');
    setIsModalOpen(false);
    setSelectedHost(null);
  };

  return <TerminalModal isOpen={isModalOpen} onClose={handleCloseModal} host={selectedHost} />;
}
