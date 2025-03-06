// This script can be loaded into the browser console to test the token directly

async function testSupabaseToken() {
  const ACCESS_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjU0MzIxL2F1dGgvdjEiLCJzdWIiOiI4M2UwMzY3MS1kOTI5LTQ2OTQtOTA4Zi01Nzc4ZjYxZjk1ODAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQxMjg1ODg3LCJpYXQiOjE3NDEyODIyODcsImVtYWlsIjoiam9hY2hpbV9kamlicmlsQGhvdG1haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnaXRodWIiLCJwcm92aWRlcnMiOlsiZ2l0aHViIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvNDA1OTA4P3Y9NCIsImVtYWlsIjoiam9hY2hpbV9kamlicmlsQGhvdG1haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkpvYWNoaW0gTidET1lFIiwiaXNzIjoiaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbSIsIm5hbWUiOiJKb2FjaGltIE4nRE9ZRSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJuYW1lIjoiYW5nZWxzdHJlZXQiLCJwcm92aWRlcl9pZCI6IjQwNTkwOCIsInN1YiI6IjQwNTkwOCIsInVzZXJfbmFtZSI6ImFuZ2Vsc3RyZWV0In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3NDEyODIyODd9XSwic2Vzc2lvbl9pZCI6ImI2NDJjNDQxLTYyNTctNDQwOC05YzE2LWMyZmU3YTNiNDE1YyIsImlzX2Fub255bW91cyI6ZmFsc2V9.puWerxqG95Wl5nut-HzwNV9ze-gNGu7phIAm--7kRKc';
  const REFRESH_TOKEN = 'YR5shHx4u9RcE01KI0xERQ';

  console.log('=== SUPABASE TOKEN TEST TOOL ===');
  console.log('Starting token validation test...');

  const testJWT = () => {
    console.log('Analyzing token structure...');
    try {
      const parts = ACCESS_TOKEN.split('.');
      if (parts.length !== 3) {
        console.error('❌ Token is not in valid JWT format');
        return false;
      }

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      console.log('✅ JWT Header:', header);
      console.log('✅ JWT Payload (partial):', {
        sub: payload.sub,
        email: payload.email,
        exp: payload.exp,
        iat: payload.iat,
        role: payload.role,
        iss: payload.iss,
        aud: payload.aud,
      });

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.error(`❌ Token is EXPIRED (${new Date(payload.exp * 1000).toISOString()})`);
        return false;
      } else if (payload.exp) {
        console.log(`✅ Token is valid until: ${new Date(payload.exp * 1000).toISOString()}`);
        return true;
      }

      return true;
    } catch (e) {
      console.error('❌ Error parsing JWT:', e);
      return false;
    }
  };

  // Get Supabase URL from meta tag if available, or use localhost
  let supabaseUrl = 'http://localhost:54321';
  const supabaseMeta = document.querySelector('meta[name="supabase-url"]');
  if (supabaseMeta) {
    supabaseUrl = supabaseMeta.getAttribute('content');
  }
  console.log('Using Supabase URL:', supabaseUrl);

  // 1. Test JWT structure
  const isValidJWT = testJWT();
  if (!isValidJWT) {
    console.error('❌ Token failed basic JWT validation');
  }

  // 2. Test token with API endpoint
  console.log('Testing token with API endpoint...');
  try {
    const testEndpoint = `/api/test-auth?access_token=${encodeURIComponent(ACCESS_TOKEN)}&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}`;
    const response = await fetch(testEndpoint);
    const result = await response.json();

    console.log('API test result:', result);

    if (result.success) {
      console.log('✅ TOKEN VALIDATION SUCCESSFUL!');
      console.log('Session info:', result.session);
    } else {
      console.error('❌ TOKEN VALIDATION FAILED:', result.error);
    }
  } catch (e) {
    console.error('❌ Error during API token test:', e);
  }

  // 3. Test with Supabase client if available
  if (window.supabase) {
    console.log('Testing with browser Supabase client...');
    try {
      const { data, error } = await window.supabase.auth.setSession({
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
      });

      if (error) {
        console.error('❌ Supabase client error:', error);
      } else if (data?.session) {
        console.log('✅ Supabase client session established!', data.session);
      } else {
        console.error('❌ No session returned from Supabase client');
      }
    } catch (e) {
      console.error('❌ Exception during Supabase client test:', e);
    }
  } else {
    console.log('⚠️ Supabase client not available in window object');
  }

  console.log('=== TEST COMPLETE ===');
}

// Run the test
testSupabaseToken();
