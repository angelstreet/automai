'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function TestAuthPage() {
  const [result, setResult] = useState<string>('Testing...');
  const [loading, setLoading] = useState<boolean>(true);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  // Test directly using the access token
  useEffect(() => {
    const testAuth = async () => {
      try {
        setLoading(true);
        
        console.log('TEST AUTH: Starting token test');
        
        // Sample token from your URL (hardcoded for testing)
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjU0MzIxL2F1dGgvdjEiLCJzdWIiOiI4M2UwMzY3MS1kOTI5LTQ2OTQtOTA4Zi01Nzc4ZjYxZjk1ODAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQxMjg1ODg3LCJpYXQiOjE3NDEyODIyODcsImVtYWlsIjoiam9hY2hpbV9kamlicmlsQGhvdG1haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnaXRodWIiLCJwcm92aWRlcnMiOlsiZ2l0aHViIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvNDA1OTA4P3Y9NCIsImVtYWlsIjoiam9hY2hpbV9kamlicmlsQGhvdG1haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkpvYWNoaW0gTidET1lFIiwiaXNzIjoiaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbSIsIm5hbWUiOiJKb2FjaGltIE4nRE9ZRSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJuYW1lIjoiYW5nZWxzdHJlZXQiLCJwcm92aWRlcl9pZCI6IjQwNTkwOCIsInN1YiI6IjQwNTkwOCIsInVzZXJfbmFtZSI6ImFuZ2Vsc3RyZWV0In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3NDEyODIyODd9XSwic2Vzc2lvbl9pZCI6ImI2NDJjNDQxLTYyNTctNDQwOC05YzE2LWMyZmU3YTNiNDE1YyIsImlzX2Fub255bW91cyI6ZmFsc2V9.puWerxqG95Wl5nut-HzwNV9ze-gNGu7phIAm--7kRKc";
        const refreshToken = "YR5shHx4u9RcE01KI0xERQ";
        
        // Parse and display token info
        try {
          // Try to decode the token to show its content
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            setTokenInfo(payload);
            console.log('Token payload:', payload);
          }
        } catch (e) {
          console.error('Error decoding token:', e);
        }
        
        // First try to get any existing session
        console.log('TEST AUTH: Checking for existing session');
        const supabase = createBrowserSupabase();
        
        const existingSession = await supabase.auth.getSession();
        console.log('Existing session:', existingSession);
        
        if (existingSession.data?.session) {
          setResult('Existing session found!');
          setSession(existingSession.data.session);
          console.log('Test successful - session exists');
          setLoading(false);
          return;
        }
        
        // No existing session, try to set a session with the token
        console.log('TEST AUTH: No existing session, trying to set session with token');
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken,
          });
          
          console.log('Set session result:', { data, error });
          
          if (error) {
            setResult(`Error setting session: ${error.message}`);
            console.error('Error setting session:', error);
          } else if (data?.session) {
            setResult('Session successfully created!');
            setSession(data.session);
            console.log('Session successfully created');
          } else {
            setResult('No session created, but no error returned');
            console.log('No session created, but no error returned');
          }
        } catch (e) {
          setResult(`Exception during setSession: ${e.message}`);
          console.error('Exception during setSession:', e);
        }
        
        // Check if we can verify the token using JWT methods
        console.log('TEST AUTH: Checking JWT validity');
        try {
          const parts = token.split('.');
          if (parts.length !== 3) {
            console.error('Token is not in valid JWT format');
          } else {
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            
            console.log('JWT header:', header);
            console.log('JWT payload:', payload);
            
            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
              console.error('Token is expired');
              setResult('Token is expired');
            } else if (payload.exp) {
              console.log('Token is valid until:', new Date(payload.exp * 1000));
            }
          }
        } catch (e) {
          console.error('Error parsing JWT:', e);
        }
        
        // Try getting session one more time
        const finalCheck = await supabase.auth.getSession();
        if (finalCheck.data?.session) {
          setResult('Session found after all operations!');
          setSession(finalCheck.data.session);
        }
      } catch (error) {
        setResult(`Test failed with error: ${error.message}`);
        console.error('Test auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    testAuth();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Token Test Page</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold">Test Result:</h2>
        <div className={`mt-2 p-2 rounded ${loading ? 'bg-yellow-100' : result.includes('Error') || result.includes('failed') ? 'bg-red-100' : 'bg-green-100'}`}>
          {loading ? 'Testing...' : result}
        </div>
      </div>
      
      {session && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h2 className="font-semibold">Session Information:</h2>
          <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      )}
      
      {tokenInfo && (
        <div className="p-4 bg-gray-50 rounded">
          <h2 className="font-semibold">Token Payload:</h2>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
            {JSON.stringify(tokenInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="font-semibold">Potential Issues:</h2>
        <ul className="list-disc ml-6 mt-2">
          <li>Token may be expired (check expiration time in payload)</li>
          <li>Token may be for a different Supabase project</li>
          <li>JWT secret mismatch between token and Supabase config</li>
          <li>CORS issues with the Supabase endpoint</li>
          <li>Network connectivity to Supabase server</li>
        </ul>
      </div>
    </div>
  );
}