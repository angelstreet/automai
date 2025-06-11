import os
from supabase import create_client, Client
from typing import Optional

# Global variable to hold the lazily-loaded client
_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Get the Supabase client instance with lazy loading."""
    global _supabase_client
    
    if _supabase_client is None:
        try:
            # Only try to create client when actually needed
            url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            
            if url and key:
                # Create client
                _supabase_client = create_client(url, key)
                print(f"[@supabase_utils:get_supabase_client] Supabase client initialized successfully")
            else:
                print(f"[@supabase_utils:get_supabase_client] Supabase environment variables not set, client not available")
                return None
        except Exception as e:
            print(f"[@supabase_utils:get_supabase_client] Failed to initialize Supabase client: {e}")
            return None
    
    return _supabase_client 