#!/bin/bash
# Start Supabase and the development server

# Add CORS configuration through environment variables
export SUPABASE_AUTH_ENABLE_CORS_CREDENTIALS=true
export SUPABASE_AUTH_ENABLE_PKCE=true
export SUPABASE_AUTH_ENABLE_IMPLICIT_GRANT=true
export SUPABASE_AUTH_CORS_ORIGIN="*"
export SUPABASE_AUTH_ALLOWED_REDIRECT_URLS="*"
export ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

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

# Stop Supabase first if it's running
echo "🔄 Stopping Supabase if running..."
npx supabase stop || true

# Start Supabase with updated configuration
echo "🔄 Starting Supabase with CORS configuration..."
npx supabase start

# Apply schema regardless of status
echo "📦 Applying database schema using fixed schema file..."
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/fixed-schema.sql || true

# Generate TypeScript types
echo "📝 Generating TypeScript types..."
npx supabase gen types typescript --local > src/types/supabase.ts || true

# Don't start the application here as the dev script will start it
echo "✅ Supabase setup complete!"

# Cleanup function not needed here since the script will exit
# and the dev script will continue