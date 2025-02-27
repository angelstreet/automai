'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/shadcn/use-toast';

export default function TerminalsPage() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have selected hosts in session storage
    const sessionData = sessionStorage.getItem('selectedMachines');

    if (sessionData) {
      try {
        const hostIds = JSON.parse(sessionData);

        // Redirect to the dashboard if no hosts are selected
        if (!Array.isArray(hostIds) || hostIds.length === 0) {
          toast({
            title: 'No hosts selected',
            description: 'Please select a host from the hosts page.',
            variant: 'destructive',
          });
          router.push('./hosts');
          return;
        }

        // Fetch host details for the first host
        if (hostIds.length > 0) {
          fetch(`/api/hosts/${hostIds[0]}`)
            .then((response) => response.json())
            .then((data) => {
              if (data.success && data.data) {
                const hostName = data.data.name;
                const count = hostIds.length > 1 ? `?count=${hostIds.length}` : '';
                router.push(`./terminals/${hostName}${count}`);
              } else {
                throw new Error('Failed to fetch host details');
              }
            })
            .catch((error) => {
              toast({
                title: 'Error',
                description: 'Failed to load terminal. Please try again.',
                variant: 'destructive',
              });
              router.push('./hosts');
            });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Invalid host data. Please try again.',
          variant: 'destructive',
        });
        router.push('./hosts');
      }
    } else {
      // No hosts selected, redirect to hosts page
      toast({
        title: 'No hosts selected',
        description: 'Please select a host from the hosts page.',
        variant: 'destructive',
      });
      router.push('./hosts');
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
