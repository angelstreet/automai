import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Cloud, Box, Server } from 'lucide-react';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getConnectionTypeIcon(type: string): string {
  switch (type) {
    case 'portainer':
      return 'portainer';
    case 'docker':
      return 'docker';
    case 'ssh':
      return 'ssh';
    default:
      return 'unknown';
  }
}
