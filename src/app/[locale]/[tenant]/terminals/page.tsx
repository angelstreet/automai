'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

export default function TerminalsPage() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have selected machines in session storage
    const sessionData = sessionStorage.getItem('selectedMachines');
    
    if (sessionData) {
      try {
        const machineIds = JSON.parse(sessionData);
        
        // Redirect to the dashboard if no machines are selected
        if (!Array.isArray(machineIds) || machineIds.length === 0) {
          toast({
            title: "No machines selected",
            description: "Please select a machine from the virtualization page.",
            variant: "destructive",
          });
          router.push('./virtualization');
          return;
        }
        
        // Fetch the first machine to get its name
        fetch(`/api/virtualization/machines/${machineIds[0]}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              const machineName = data.data.name;
              const count = machineIds.length > 1 ? `?count=${machineIds.length}` : '';
              router.push(`./terminals/${machineName}${count}`);
            } else {
              throw new Error('Failed to fetch machine details');
            }
          })
          .catch(error => {
            toast({
              title: "Error",
              description: "Failed to load terminal. Please try again.",
              variant: "destructive",
            });
            router.push('./virtualization');
          });
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid machine data. Please try again.",
          variant: "destructive",
        });
        router.push('./virtualization');
      }
    } else {
      // No machines selected, redirect to virtualization page
      toast({
        title: "No machines selected",
        description: "Please select a machine from the virtualization page.",
        variant: "destructive",
      });
      router.push('./virtualization');
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
} 