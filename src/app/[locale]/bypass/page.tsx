'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function BypassPage() {
  const { locale } = useParams();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Set debug bypass cookie
    document.cookie = "debug-bypass=true; path=/; SameSite=Lax; max-age=3600";
    setIsReady(true);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Auth Bypass Enabled</h1>
        
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200">
          {isReady ? 
            <p>Bypass cookie has been set. You can now access protected pages without authentication for 1 hour.</p> : 
            <p>Setting bypass cookie...</p>
          }
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Pages:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href={`/${locale}/trial/dashboard`}
              className="block p-3 bg-blue-500 hover:bg-blue-600 text-white rounded text-center"
            >
              Dashboard
            </Link>
            <Link 
              href={`/${locale}/login-debug`}
              className="block p-3 bg-purple-500 hover:bg-purple-600 text-white rounded text-center"
            >
              Auth Debug
            </Link>
            <Link 
              href={`/${locale}/Trial/dashboard`}
              className="block p-3 bg-orange-500 hover:bg-orange-600 text-white rounded text-center"
            >
              Case Test
            </Link>
            <Link 
              href={`/${locale}/login?redirect=true`}
              className="block p-3 bg-teal-500 hover:bg-teal-600 text-white rounded text-center"
            >
              Login Page
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p>To remove the bypass, clear your cookies or wait one hour.</p>
        </div>
      </div>
    </div>
  );
}