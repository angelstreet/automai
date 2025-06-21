#!/usr/bin/env python3
"""
Direct Database Test

Tests the database layer directly with hardcoded team_id to isolate the issue.
This bypasses the API layer and tests the database functions directly.
"""

import sys
import os

# Add src to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
sys.path.insert(0, project_root)

def test_db_direct():
    """Test the database layer directly with hardcoded values"""
    print("🧪 Direct Database Test")
    print("=" * 50)
    
    try:
        # Set up Supabase environment variables (hardcoded for testing)
        os.environ['NEXT_PUBLIC_SUPABASE_URL'] = 'https://wexkgcszrwxqsthahfyq.supabase.co'
        os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndleGtnY3N6cnd4cXN0aGFoZnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMDAyNzAsImV4cCI6MjA1NjY3NjI3MH0.v9RiuNSa-8xuVLW-oRbcvQq9cllysLiRt2vEeIm1zwA'
        
        from src.lib.supabase.verifications_references_db import get_references
        from src.utils.app_utils import DEFAULT_TEAM_ID
        
        # Test parameters - these should match what we know is in the database
        team_id = DEFAULT_TEAM_ID  # 7fdeb4bb-3639-4ec3-959f-b54769a219ce
        device_model = 'android_mobile'
        
        print(f"📋 Testing with:")
        print(f"   team_id: {team_id}")
        print(f"   device_model: {device_model}")
        
        # Call the database function directly
        result = get_references(
            team_id=team_id,
            device_model=device_model
        )
        
        print(f"\n📥 Result:")
        print(f"   success: {result.get('success')}")
        print(f"   count: {result.get('count', 0)}")
        print(f"   images length: {len(result.get('images', []))}")
        
        if result.get('error'):
            print(f"   error: {result['error']}")
            return False
        
        if result.get('success') and result.get('images'):
            print(f"\n📄 References found:")
            for i, ref in enumerate(result['images'], 1):
                name = ref.get('name', 'unknown')
                ref_type = ref.get('type', 'unknown')
                r2_url = ref.get('r2_url', 'no URL')
                print(f"   {i}. {name} ({ref_type})")
                if ref_type == 'reference_image':
                    print(f"      URL: {r2_url}")
                elif ref_type == 'reference_text':
                    area = ref.get('area', {})
                    text = area.get('text', 'no text') if area else 'no text'
                    print(f"      Text: '{text}'")
            
            print(f"\n✅ SUCCESS - Found {result['count']} references!")
            return True
        else:
            print(f"\n❌ FAILED - No references found")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR - {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_all_team_ids():
    """Test with different team_id values to see what's in the database"""
    print("\n🔍 Testing all team_id values in database")
    print("=" * 50)
    
    try:
        # Set up Supabase environment variables
        os.environ['NEXT_PUBLIC_SUPABASE_URL'] = 'https://wexkgcszrwxqsthahfyq.supabase.co'
        os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndleGtnY3N6cnd4cXN0aGFoZnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MjU1NzEsImV4cCI6MjA1MDEwMTU3MX0.YVh8Wq7vR1-aT-eZZXcHYbLRVbGqKfYIpzOdWPvPNVs'
        
        from src.utils.supabase_utils import get_supabase_client
        
        supabase = get_supabase_client()
        if not supabase:
            print("❌ Could not connect to Supabase")
            return False
        
        # Query to see all team_id and device_model combinations
        result = supabase.table('verifications_references').select('team_id, device_model').execute()
        
        if result.data:
            print(f"📋 Found {len(result.data)} references in database:")
            
            # Group by team_id and device_model
            combinations = {}
            for row in result.data:
                team_id = row.get('team_id', 'unknown')
                device_model = row.get('device_model', 'unknown')
                key = f"{team_id}|{device_model}"
                combinations[key] = combinations.get(key, 0) + 1
            
            for key, count in combinations.items():
                team_id, device_model = key.split('|')
                print(f"   team_id: {team_id}")
                print(f"   device_model: {device_model}")
                print(f"   count: {count}")
                print()
            
            return True
        else:
            print("❌ No data found in verifications_references table")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    print("🧪 VirtualPyTest - Direct Database Test")
    print("=" * 60)
    
    # Test 1: Direct database query with expected values
    success1 = test_db_direct()
    
    # Test 2: Check what's actually in the database
    success2 = test_all_team_ids()
    
    print("\n" + "=" * 60)
    if success1:
        print("🎉 Direct database test passed!")
    else:
        print("⚠️  Direct database test failed!")
        
    if success2:
        print("✅ Database content analysis completed!")
    else:
        print("❌ Database content analysis failed!")
    
    return success1 and success2

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 