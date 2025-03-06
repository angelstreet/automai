'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase';

export default function LoginDebugPage() {
  const [sessionState, setSessionState] = useState<any>(null);
  const [cookies, setCookies] = useState<string[]>([]);
  const [storage, setStorage] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to check session
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);

      // Get all cookies
      const allCookies = document.cookie.split('; ');
      setCookies(allCookies);

      // Get localStorage
      const storageItems: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            storageItems[key] = localStorage.getItem(key) || '';
          } catch (e) {
            storageItems[key] = 'Error reading item';
          }
        }
      }
      setStorage(storageItems);

      // Create a Supabase client
      const supabase = createBrowserSupabase();

      // Get session
      const { data, error } = await supabase.auth.getSession();

      setSessionState({
        hasSession: !!data.session,
        sessionExpiry: data.session?.expires_at
          ? new Date(data.session.expires_at * 1000).toISOString()
          : 'n/a',
        user: data.session?.user?.email || 'none',
        error: error ? error.message : null,
      });
    } catch (e) {
      console.error('Error checking session:', e);
      setSessionState({ error: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to manually create a session for testing
  const createTestSession = async () => {
    try {
      setLoading(true);

      // Create a test email that includes timestamp to avoid duplicates
      const testEmail = `test_${Date.now()}@example.com`;

      // Create a Supabase client
      const supabase = createBrowserSupabase();

      // Sign up with a test account
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'password123!', // Strong test password
        options: {
          data: {
            name: 'Test User',
            role: 'user',
            tenantId: 'trial',
            tenantName: 'trial',
          },
        },
      });

      if (error) {
        alert(`Error creating test account: ${error.message}`);
      } else {
        alert(`Test account created with email: ${testEmail}`);

        // Refresh session state
        checkSession();
      }
    } catch (e) {
      console.error('Error creating test session:', e);
      alert(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually create direct cookie
  const createDirectCookie = () => {
    try {
      // Create a hardcoded cookie for testing
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      document.cookie = `sb-auth-token=TEST_TOKEN; path=/; expires=${tomorrow.toUTCString()}; SameSite=Lax`;

      alert('Test cookie created');

      // Refresh cookies display
      setCookies(document.cookie.split('; '));
    } catch (e) {
      alert(`Error creating cookie: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  // Check session on component mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>

      <div className="flex gap-4 mb-6">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={checkSession}
          disabled={loading}
        >
          Refresh Status
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={createTestSession}
          disabled={loading}
        >
          Create Test Account
        </button>
        <button className="px-4 py-2 bg-yellow-500 text-white rounded" onClick={createDirectCookie}>
          Create Test Cookie
        </button>
        <button
          className="px-4 py-2 bg-indigo-500 text-white rounded"
          onClick={() => router.push('/en/trial/dashboard')}
        >
          Go to Dashboard
        </button>
        <button
          className="px-4 py-2 bg-pink-500 text-white rounded"
          onClick={() => {
            // Set a debug cookie and force redirect to test auth bypass
            document.cookie = 'debug-bypass=true; path=/; SameSite=Lax';
            router.push('/en/login?redirect=true');
          }}
        >
          Test Redirect
        </button>
      </div>

      {loading ? (
        <div className="text-center p-4">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Session Status</h2>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 dark:bg-gray-800">
              {JSON.stringify(sessionState, null, 2)}
            </pre>
          </div>

          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Cookies</h2>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 dark:bg-gray-800">
              {cookies.length > 0 ? cookies.map((cookie) => cookie + '\n') : 'No cookies found'}
            </pre>
          </div>

          <div className="border p-4 rounded md:col-span-2">
            <h2 className="text-xl font-semibold mb-2">LocalStorage</h2>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 dark:bg-gray-800">
              {JSON.stringify(storage, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
