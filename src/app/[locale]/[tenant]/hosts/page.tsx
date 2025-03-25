'use client';

import { HostContextProvider } from '@/context';

import HostList from './_components/HostList';

export default function HostsPage() {
  return (
    <HostContextProvider>
      <HostList />
    </HostContextProvider>
  );
}