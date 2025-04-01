'use client';

import { SiteHeader } from '@/components/layout/SiteHeader';

// Temporarily use direct imports instead of the indexed imports
// to help isolate any potential issues with the import path
import { Hero } from './(marketing)/_components/client/Hero';
import { Features } from './(marketing)/_components/client/Features';

// Debug component to help diagnose rendering issues
function DebugInfo() {
  return (
    <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md mb-4" suppressHydrationWarning>
      <h2 className="font-bold">Debug Information</h2>
      <p>Page is rendering correctly at this point</p>
      <p>App Version: {process.env.NEXT_PUBLIC_APP_VERSION || 'development'}</p>
      <p suppressHydrationWarning>Node Environment: {process.env.NODE_ENV}</p>
      <p suppressHydrationWarning>Time: {new Date().toISOString()}</p>
      <p suppressHydrationWarning>Browser: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'}</p>
    </div>
  );
}

export default function Page() {
  console.log('Rendering Page component');
  
  // Simplest possible version - no dependencies
  return (
    <div className="p-8 max-w-4xl mx-auto" suppressHydrationWarning>
      <h1 className="text-3xl font-bold mb-4">Automai</h1>
      <p className="text-xl mb-6">Automate your infrastructure with AI</p>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
        <p>If you're seeing this page, the basic rendering is working properly.</p>
        <p>Client-side hydration is also working.</p>
      </div>
    </div>
  );
}