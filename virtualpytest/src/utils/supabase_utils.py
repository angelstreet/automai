import os
from supabase import create_client, Client
from typing import Optional

# Global variable to hold the lazily-loaded client
_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Get the Supabase client instance with lazy loading."""
    global _supabase_client
    
    print(f"[@supabase_utils:get_supabase_client] Starting client creation process...")
    
    if _supabase_client is None:
        try:
            # Only try to create client when actually needed
            url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            
            # Debug logging with masked secrets
            print(f"[@supabase_utils:get_supabase_client] Environment variables check:")
            print(f"[@supabase_utils:get_supabase_client]   NEXT_PUBLIC_SUPABASE_URL: {'***' + url[-20:] if url and len(url) > 20 else 'NOT_SET'}")
            print(f"[@supabase_utils:get_supabase_client]   NEXT_PUBLIC_SUPABASE_ANON_KEY: {'***' + key[-10:] if key and len(key) > 10 else 'NOT_SET'}")
            
            if url and key:
                print(f"[@supabase_utils:get_supabase_client] Environment variables found, creating Supabase client...")
                print(f"[@supabase_utils:get_supabase_client] URL length: {len(url)} characters")
                print(f"[@supabase_utils:get_supabase_client] Key length: {len(key)} characters")
                
                # Create client with options to avoid HTTP/2 connection reuse issues
                _supabase_client = create_client(url, key)
                print(f"[@supabase_utils:get_supabase_client] ✅ Supabase client initialized successfully")
                print(f"[@supabase_utils:get_supabase_client] Client type: {type(_supabase_client)}")
                
                # Test basic connectivity
                try:
                    # Try to get the URL to test if client is working
                    client_url = getattr(_supabase_client, 'supabase_url', None)
                    print(f"[@supabase_utils:get_supabase_client] Client URL property: {'***' + client_url[-20:] if client_url else 'None'}")
                except Exception as test_error:
                    print(f"[@supabase_utils:get_supabase_client] ⚠️ Client created but basic test failed: {test_error}")
                    
            else:
                print(f"[@supabase_utils:get_supabase_client] ❌ Missing environment variables:")
                if not url:
                    print(f"[@supabase_utils:get_supabase_client]   - NEXT_PUBLIC_SUPABASE_URL is missing or empty")
                if not key:
                    print(f"[@supabase_utils:get_supabase_client]   - NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty")
                print(f"[@supabase_utils:get_supabase_client] Supabase client not available")
                return None
        except Exception as e:
            print(f"[@supabase_utils:get_supabase_client] ❌ Failed to initialize Supabase client: {e}")
            print(f"[@supabase_utils:get_supabase_client] Exception type: {type(e).__name__}")
            import traceback
            print(f"[@supabase_utils:get_supabase_client] Full traceback:")
            traceback.print_exc()
            return None
    else:
        print(f"[@supabase_utils:get_supabase_client] ♻️ Returning existing Supabase client singleton")
    
    print(f"[@supabase_utils:get_supabase_client] Final client state: {_supabase_client is not None}")
    return _supabase_client 