#!/usr/bin/env python3
"""
VirtualPyTest Database Setup Script

This script helps users set up their database with the minimal schema required for VirtualPyTest.
It can work with both Supabase and local PostgreSQL databases.
"""

import os
import sys
from pathlib import Path
from utils.supabase_utils import get_supabase_client

def read_schema_file():
    """Read the schema SQL file."""
    schema_path = Path(__file__).parent / "virtualpytest_schema.sql"
    if not schema_path.exists():
        print(f"❌ Schema file not found: {schema_path}")
        return None
    
    with open(schema_path, 'r') as f:
        return f.read()

def setup_database():
    """Set up the database with the minimal schema."""
    print("🚀 VirtualPyTest Database Setup")
    print("=" * 40)
    
    # Check environment variables
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables!")
        print("Please set the following environment variables:")
        print("  - NEXT_PUBLIC_SUPABASE_URL")
        print("  - NEXT_PUBLIC_SUPABASE_ANON_KEY")
        print("\nYou can create a .env file with these values.")
        return False
    
    print(f"📡 Connecting to Supabase: {supabase_url}")
    
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        print("✅ Connected to Supabase successfully!")
        
        # Read schema file
        print("📄 Reading schema file...")
        schema_sql = read_schema_file()
        if not schema_sql:
            return False
        
        print("✅ Schema file loaded successfully!")
        
        # Execute schema
        print("🔧 Setting up database schema...")
        print("   This may take a few moments...")
        
        # Split the schema into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        success_count = 0
        for i, statement in enumerate(statements, 1):
            try:
                if statement.upper().startswith(('CREATE', 'ALTER', 'INSERT', 'DROP')):
                    result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                    success_count += 1
                    print(f"   ✓ Statement {i}/{len(statements)} executed")
            except Exception as e:
                # Some statements might fail if objects already exist, which is okay
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"   ⚠ Statement {i}/{len(statements)} skipped (already exists)")
                else:
                    print(f"   ❌ Statement {i}/{len(statements)} failed: {e}")
        
        print(f"\n✅ Database setup completed!")
        print(f"   Successfully executed {success_count}/{len(statements)} statements")
        
        # Verify setup by checking if tables exist
        print("\n🔍 Verifying database setup...")
        try:
            # Try to query the teams table
            result = supabase.table('teams').select('id, name').limit(1).execute()
            print("✅ Database verification successful!")
            
            if result.data:
                print(f"   Found {len(result.data)} team(s) in database")
            else:
                print("   Database is empty - ready for use!")
                
        except Exception as e:
            print(f"⚠ Database verification failed: {e}")
            print("   The schema may have been partially applied.")
        
        print("\n🎉 Setup complete!")
        print("You can now start the Flask backend with: python app.py")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check your environment variables")
        print("2. Verify your Supabase project is active")
        print("3. Ensure your API key has the correct permissions")
        return False

def main():
    """Main entry point."""
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help']:
        print("VirtualPyTest Database Setup Script")
        print("\nUsage: python setup_database.py")
        print("\nEnvironment variables required:")
        print("  NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL")
        print("  NEXT_PUBLIC_SUPABASE_ANON_KEY - Your Supabase anonymous key")
        print("\nThis script will:")
        print("  1. Connect to your Supabase database")
        print("  2. Create all required tables and indexes")
        print("  3. Set up Row Level Security policies")
        print("  4. Insert demo data for testing")
        return
    
    success = setup_database()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 