#!/bin/bash
# Start Supabase and the development server

echo "🚀 Starting Supabase development environment"

# Check if supabase directory exists
if [ ! -d "node_modules/supabase" ]; then
    echo "❌ Supabase CLI not found. Installing locally..."
    npm install supabase --save-dev
fi

# Set up the path to use the local Supabase CLI
export PATH="$PWD/node_modules/.bin:$PATH"

# Check if Supabase is already initialized
if [ ! -d .supabase ]; then
    echo "🔧 Initializing Supabase..."
    supabase init
fi

# Check if Supabase is running
SUPABASE_STATUS=$(supabase status || echo "not running")
if [[ $SUPABASE_STATUS == *"not running"* ]]; then
    echo "🔄 Starting Supabase..."
    supabase start
else
    echo "✅ Supabase is already running"
fi

# Check if schema has been applied
echo "🔍 Checking if schema has been applied..."
# First check if Supabase is running before attempting to check the schema
if supabase status | grep -q "Started"; then
    # Apply the fixed schema file directly using psql
    echo "📦 Applying database schema using fixed schema file..."
    PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/fixed-schema.sql
    
    # Generate TypeScript types
    echo "📝 Generating TypeScript types..."
    supabase gen types typescript --local > src/types/supabase.ts
else
    echo "❌ Supabase is not running correctly. Please check the status."
    exit 1
fi

# Don't start the application here as the dev script will start it
echo "✅ Supabase setup complete!"

# Cleanup function not needed here since the script will exit
# and the dev script will continue