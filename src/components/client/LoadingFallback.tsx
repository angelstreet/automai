'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingFallbackProps {
  text?: string;
  className?: string;
}

export function LoadingFallback({ text = 'Loading...', className = '' }: LoadingFallbackProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
