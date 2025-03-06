#!/bin/bash
# Start Supabase and the development server

echo "🚀 Starting Supabase development environment"

# Check if running in a Codespace
if [ -n "$CODESPACE_NAME" ]; then
  echo "🌐 Detected GitHub Codespace environment"
  # Switch to Codespace configuration
  ./scripts/switch-supabase-config.sh codespace
else
  echo "💻 Detected local development environment"
  # Switch to local configuration
  ./scripts/switch-supabase-config.sh local
fi

# Check if supabase directory exists
if [ ! -d "node_modules/supabase" ]; then
    echo "❌ Supabase CLI not found. Installing locally..."
    npm install supabase --save-dev
fi

# Set up the path to use the local Supabase CLI
export PATH="$PWD/node_modules/.bin:$PATH"

# We'll skip initialization since it already exists
# Just make sure Supabase is running
echo "🔄 Starting Supabase if not already running..."
npx supabase start || true

# Apply schema regardless of status
echo "📦 Applying database schema using fixed schema file..."
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/fixed-schema.sql || true

# Generate TypeScript types
echo "📝 Generating TypeScript types..."
npx supabase gen types typescript --local > src/types/supabase.ts || true

# Don't start the application here as the dev script will start it
echo "✅ Supabase setup complete!"

# Cleanup function not needed here since the script will exit
# and the dev script will continue