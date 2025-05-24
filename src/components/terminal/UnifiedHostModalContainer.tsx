'use client';

import { useEffect, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

import { UnifiedHostModal } from './UnifiedHostModal';

export function UnifiedHostModalContainer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [defaultTab, setDefaultTab] = useState<'vnc' | 'terminal'>('terminal');

  useEffect(() => {
    // Import events dynamically to avoid SSR issues
    const setupEventListeners = async () => {
      const { HostsEvents } = await import(
        '@/app/[locale]/[tenant]/hosts/_components/client/HostEventListener'
      );

      const handleOpenModal = (event: CustomEvent) => {
        console.log('[@component:UnifiedHostModalContainer] Opening modal', event.detail);

        if (event.detail?.host) {
          setSelectedHost(event.detail.host);
          setModalTitle(event.detail.title || `${event.detail.host.name} - Remote Access`);
          setDefaultTab(event.detail.defaultTab || 'terminal');
          setIsModalOpen(true);
        }
      };

      const handleCloseModal = () => {
        console.log('[@component:UnifiedHostModalContainer] Closing modal');
        setIsModalOpen(false);
        setSelectedHost(null);
        setModalTitle('');
        setDefaultTab('terminal');
      };

      // Add event listeners for various modal types
      window.addEventListener(HostsEvents.OPEN_TERMINAL_MODAL, handleOpenModal as EventListener);
      window.addEventListener('OPEN_VNC_MODAL', handleOpenModal as EventListener);
      window.addEventListener('OPEN_HOST_MODAL', handleOpenModal as EventListener);
      window.addEventListener(HostsEvents.CLOSE_TERMINAL_MODAL, handleCloseModal);
      window.addEventListener('CLOSE_VNC_MODAL', handleCloseModal);
      window.addEventListener('CLOSE_HOST_MODAL', handleCloseModal);

      // Cleanup function
      return () => {
        window.removeEventListener(
          HostsEvents.OPEN_TERMINAL_MODAL,
          handleOpenModal as EventListener,
        );
        window.removeEventListener('OPEN_VNC_MODAL', handleOpenModal as EventListener);
        window.removeEventListener('OPEN_HOST_MODAL', handleOpenModal as EventListener);
        window.removeEventListener(HostsEvents.CLOSE_TERMINAL_MODAL, handleCloseModal);
        window.removeEventListener('CLOSE_VNC_MODAL', handleCloseModal);
        window.removeEventListener('CLOSE_HOST_MODAL', handleCloseModal);
      };
    };

    const cleanup = setupEventListeners();

    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
  }, []);

  const handleCloseModal = () => {
    console.log('[@component:UnifiedHostModalContainer] Modal close requested');
    setIsModalOpen(false);
    setSelectedHost(null);
    setModalTitle('');
    setDefaultTab('terminal');
  };

  return (
    <UnifiedHostModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      host={selectedHost}
      title={modalTitle}
      defaultTab={defaultTab}
    />
  );
}
