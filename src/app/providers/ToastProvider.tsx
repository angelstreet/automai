'use client';

import { Toaster } from 'sonner';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster 
        position="top-right" 
        richColors 
        expand={false}
        duration={4000}
        toastOptions={{
          style: {
            cursor: 'pointer',
          },
          className: 'cursor-pointer',
        }}
      />
    </>
  );
}
